const { HttpError, badRequest, conflict } = require('../lib/errors')
const { findOwnedBooking, lookupBooking } = require('./bookings')
const { loadSettings } = require('./settings')

/**
 * Pembayaran DP online lewat Midtrans (Snap). Tiga jalur menuju hasil yang sama:
 *  1. startOnlinePayment: pelanggan memilih "Bayar online", server membuat transaksi dan memberi alamat halaman bayar.
 *  2. handleNotification: Midtrans memberi tahu server (webhook). Tanda tangan diperiksa, lalu status dibaca ulang dari
 *     server Midtrans, jadi isi notifikasi sendiri tidak dipercaya begitu saja.
 *  3. syncPayment: pelanggan kembali dari halaman bayar dan server menanyakan statusnya langsung. Ini membuat uji di laptop
 *     (yang tidak bisa dijangkau webhook) tetap jalan, dan menutup kemungkinan webhook terlambat.
 * Ketiganya berujung di applyTransactionStatus: DP ditandai dibayar, booking dikonfirmasi, dan worker mengirim bukti booking.
 */

const unavailable = () => new HttpError(503, 'payment_unavailable', 'Pembayaran online belum tersedia. Silakan bayar lewat transfer manual.')

function gatewayFailure(error) {
  console.error('Pembayaran online gagal:', error.message)
  return new HttpError(502, 'payment_gateway_error', 'Pembayaran online sedang tidak tersedia. Coba lagi sebentar lagi atau bayar lewat transfer manual.')
}

/** Kode booking dari order id "PS-1234-ab12cd" (kode + akhiran unik per percobaan bayar). */
function codeFromOrderId(orderId) {
  return String(orderId ?? '').replace(/-[A-Za-z0-9]+$/, '')
}

/** Waktu bayar dari Midtrans ("2026-11-25 09:05:00", waktu WIB). Kalau formatnya tak terduga, pakai jam server. */
function paidAtIso(status, clock) {
  const raw = status.settlement_time || status.transaction_time
  const parsed = raw ? new Date(`${String(raw).replace(' ', 'T')}+07:00`) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : clock().toISOString()
}

function paymentConfig({ midtrans }) {
  return { online: Boolean(midtrans), provider: midtrans ? 'midtrans' : null, sandbox: midtrans ? midtrans.sandbox : null }
}

/** Nama metode di tabel pembayaran (pelanggan) dan di tabel transaksi (kasir, daftar yang dikenal web internal). */
function methodLabels(paymentType) {
  const type = String(paymentType ?? '')
  const cashier = ['qris', 'gopay', 'shopeepay'].includes(type) ? 'QRIS' : ['bank_transfer', 'echannel', 'permata', 'bca_klikpay'].includes(type) ? 'Transfer Bank' : 'Online'
  return { gateway: type ? `midtrans:${type}` : 'midtrans', cashier }
}

async function startOnlinePayment(ctx, { code, phone }) {
  const { db, clock, midtrans, webUrl } = ctx
  if (!midtrans) throw unavailable()
  const settings = await loadSettings(db)
  const row = await findOwnedBooking(db, { code, phone })

  if (row.status !== 'menunggu_pembayaran') throw conflict('not_awaiting_payment', 'Booking ini tidak sedang menunggu pembayaran DP.')
  if (row.dp_status === 'dibayar') throw conflict('already_paid', 'DP booking ini sudah dibayar.')
  if (!(row.dp_nominal > 0)) throw conflict('no_dp', 'Booking ini tidak memerlukan DP.')

  const holdEnds = new Date(row.created_at).getTime() + settings.dpHoldMinutes * 60_000
  const minutesLeft = Math.floor((holdEnds - clock().getTime()) / 60_000)
  if (minutesLeft < 2) throw conflict('hold_expired', 'Batas waktu bayar DP sudah hampir habis atau lewat. Buat booking baru.')

  // Order id harus unik per percobaan: pelanggan boleh mencoba lagi kalau halaman bayarnya kedaluwarsa atau ditutup.
  const orderId = `${row.code}-${clock().getTime().toString(36)}`
  let created
  try {
    created = await midtrans.createTransaction({
      orderId,
      amount: row.dp_nominal,
      customerName: row.nama_customer,
      customerPhone: row.no_whatsapp,
      itemName: `DP ${row.nama_layanan}`,
      // Halaman bayar kedaluwarsa bersamaan dengan batas tahan slot, jadi pembayaran tidak bisa masuk setelah slot dilepas.
      expiryMinutes: minutesLeft,
      finishUrl: webUrl ? `${webUrl.replace(/\/$/, '')}/e-ticket` : undefined,
    })
  } catch (error) {
    throw gatewayFailure(error)
  }

  await db.query(
    `UPDATE pembayaran SET metode_pembayaran = 'midtrans', ref_gateway = $2
      WHERE id_pembayaran = (SELECT id_pembayaran FROM pembayaran WHERE id_booking = $1 AND jenis_pembayaran = 'dp' ORDER BY id_pembayaran DESC LIMIT 1)
        AND status_pembayaran = 'menunggu'`,
    [row.id, orderId],
  )
  return { orderId, token: created.token, redirectUrl: created.redirectUrl, expiresInMinutes: minutesLeft }
}

/**
 * Menerapkan status transaksi dari Midtrans ke booking. Aman dipanggil berulang (webhook bisa datang dua kali):
 * DP yang sudah dibayar tidak diproses lagi.
 * @returns {Promise<{ result: 'paid' | 'already_paid' | 'pending' | 'ignored' | 'unknown_booking' | 'amount_mismatch' | 'paid_after_cancel', code?: string }>}
 */
async function applyTransactionStatus({ db, clock }, status) {
  const orderId = status.order_id
  const code = codeFromOrderId(orderId)
  const paid = String(status.status_code) === '200' && (status.transaction_status === 'settlement' || (status.transaction_status === 'capture' && (status.fraud_status ?? 'accept') === 'accept'))
  const pending = status.transaction_status === 'pending'
  const labels = methodLabels(status.payment_type)

  return db.transaction(async (tx) => {
    const found = await tx.query(
      `SELECT id_booking::int AS id, status_booking AS status, id_customer, id_capster, total_harga FROM booking WHERE kode_booking = $1 FOR UPDATE`,
      [code],
    )
    const booking = found.rows[0]
    if (!booking) return { result: 'unknown_booking', code }

    const dpRows = await tx.query(
      `SELECT id_pembayaran AS id, status_pembayaran AS status, nominal::float8 AS nominal, ref_gateway
         FROM pembayaran WHERE id_booking = $1 AND jenis_pembayaran = 'dp' ORDER BY id_pembayaran DESC LIMIT 1 FOR UPDATE`,
      [booking.id],
    )
    const dp = dpRows.rows[0]
    if (!dp) return { result: 'ignored', code }
    if (dp.status === 'dibayar') return { result: 'already_paid', code }

    if (!paid) {
      // Pelanggan sudah memilih cara bayar (mis. virtual account) tapi belum membayar: catat saja metodenya.
      if (pending) {
        await tx.query(`UPDATE pembayaran SET metode_pembayaran = $2, ref_gateway = $3 WHERE id_pembayaran = $1 AND status_pembayaran = 'menunggu'`, [dp.id, labels.gateway, orderId])
        return { result: 'pending', code }
      }
      // expire / cancel / deny / failure: DP tetap menunggu, pelanggan boleh mencoba lagi selama slot masih ditahan.
      return { result: 'ignored', code }
    }

    // Nominal harus sama persis dengan DP booking. Selisih berarti ada yang janggal; jangan ditandai lunas, biar kasir memeriksa.
    if (Math.round(Number(status.gross_amount)) !== Math.round(dp.nominal)) {
      console.error(`Nominal pembayaran ${orderId} (${status.gross_amount}) tidak cocok dengan DP ${dp.nominal}; tidak dikonfirmasi otomatis.`)
      return { result: 'amount_mismatch', code }
    }

    await tx.query(
      `UPDATE pembayaran SET status_pembayaran = 'dibayar', metode_pembayaran = $2, ref_gateway = $3, waktu_bayar = $4::timestamptz WHERE id_pembayaran = $1`,
      [dp.id, labels.gateway, orderId, paidAtIso(status, clock)],
    )

    if (booking.status === 'dibatalkan') {
      // Uang masuk setelah booking dibatalkan (slot sudah dilepas): jangan menghidupkan lagi, kasir perlu mengembalikan atau menjadwalkan ulang.
      console.error(`Pembayaran ${orderId} masuk setelah booking ${code} dibatalkan. Perlu tindak lanjut kasir.`)
      return { result: 'paid_after_cancel', code }
    }
    if (booking.status === 'menunggu_pembayaran') {
      await tx.query(`UPDATE booking SET status_booking = 'dikonfirmasi', updated_at = now() WHERE id_booking = $1`, [booking.id])
    }

    // Catatan transaksi untuk web internal (laporan, kasir). Tabelnya milik sisi internal dan tidak ada di database tes/dev tertanam.
    const hasTransaksi = (await tx.query(`SELECT to_regclass('public.transaksi') IS NOT NULL AS ok`)).rows[0].ok
    if (hasTransaksi) {
      await tx.query(
        `INSERT INTO transaksi (kode_transaksi, jenis_transaksi, id_booking, id_customer, id_capster, total_tagihan, total_dibayar,
                                status_transaksi, status_layanan, metode_pembayaran)
         VALUES ($1, 'booking', $2, $3, $4, $5, $6, 'belum', 'belum dimulai', $7)
         ON CONFLICT (id_booking) DO UPDATE SET total_dibayar = EXCLUDED.total_dibayar, metode_pembayaran = EXCLUDED.metode_pembayaran`,
        [`TRX-${code}`, booking.id, booking.id_customer, booking.id_capster, booking.total_harga, dp.nominal, labels.cashier],
      )
    }
    return { result: 'paid', code }
  })
}

/** Webhook Midtrans. Tanda tangan salah ditolak; status yang dipakai selalu hasil bacaan ulang dari server Midtrans. */
async function handleNotification(ctx, notification) {
  const { midtrans } = ctx
  if (!midtrans) throw unavailable()
  if (!notification || typeof notification.order_id !== 'string') throw badRequest('invalid_input', 'Notifikasi tidak valid.')
  if (!midtrans.verifySignature(notification)) throw new HttpError(403, 'invalid_signature', 'Tanda tangan notifikasi tidak valid.')

  let status
  try {
    status = await midtrans.getStatus(notification.order_id)
  } catch (error) {
    // Galat sementara: balas 502 supaya Midtrans mengirim ulang notifikasinya nanti.
    throw gatewayFailure(error)
  }
  if (!status) return { result: 'ignored' }
  return applyTransactionStatus(ctx, status)
}

/** Pelanggan kembali dari halaman bayar: tanyakan status ke Midtrans lalu kembalikan booking terbaru. */
async function syncPayment(ctx, { code, phone }) {
  const { db, midtrans } = ctx
  if (!midtrans) throw unavailable()
  const row = await findOwnedBooking(db, { code, phone })

  const ref = (
    await db.query(
      `SELECT ref_gateway FROM pembayaran WHERE id_booking = $1 AND jenis_pembayaran = 'dp' AND ref_gateway IS NOT NULL ORDER BY id_pembayaran DESC LIMIT 1`,
      [row.id],
    )
  ).rows[0]?.ref_gateway

  let result = 'ignored'
  if (ref && row.status === 'menunggu_pembayaran') {
    let status
    try {
      status = await midtrans.getStatus(ref)
    } catch (error) {
      throw gatewayFailure(error)
    }
    if (status) result = (await applyTransactionStatus(ctx, status)).result
  }
  return { result, reservation: await lookupBooking(ctx, { code, phone }) }
}

module.exports = { paymentConfig, startOnlinePayment, handleNotification, syncPayment, applyTransactionStatus, codeFromOrderId }
