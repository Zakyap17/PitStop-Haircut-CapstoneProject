const { buildMessage } = require('./templates')
const { loadSettings } = require('../services/settings')
const { SELECT_BOOKING, nowText, toDto } = require('../services/booking-queries')

const MAX_ATTEMPTS = 5
/** Jeda sebelum percobaan ulang setelah gagal ke-1, ke-2, ... (detik). */
const BACKOFF_SECONDS = [30, 120, 600, 1800]
/** Pesan yang sedang dikirim "dipinjam" selama ini; kalau backend mati di tengah jalan, pesan dicoba lagi setelahnya. */
const LEASE_MINUTES = 3

/**
 * Menulis pesan ke antrean (tabel notifikasi_whatsapp). Dipanggil di dalam transaksi yang sama dengan perubahan booking-nya,
 * jadi pesan hanya ada kalau booking-nya benar-benar tersimpan.
 */
async function enqueueMessage(tx, { bookingId, kind, phone, reservation, settings, webUrl, now, extra }) {
  if (!phone) return false
  await tx.query(
    `INSERT INTO notifikasi_whatsapp (id_booking, no_tujuan, jenis_pesan, status_kirim, pesan, jadwal_kirim)
     VALUES ($1, $2, $3, 'menunggu', $4, $5::timestamptz)`,
    [bookingId, phone, kind, buildMessage(kind, reservation, settings, webUrl, extra), now],
  )
  return true
}

/** Mengambil satu pesan yang jatuh tempo dan menandainya "dipinjam" supaya tidak diambil dua kali. */
async function claimNext(db, now) {
  const { rows } = await db.query(
    `UPDATE notifikasi_whatsapp
        SET percobaan = percobaan + 1, jadwal_kirim = $1::timestamptz + make_interval(mins => $2)
      WHERE id_notifikasi = (SELECT id_notifikasi FROM notifikasi_whatsapp
                              WHERE status_kirim = 'menunggu' AND jadwal_kirim <= $1::timestamptz
                              ORDER BY id_notifikasi FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id_notifikasi::int AS id, no_tujuan AS recipient, pesan AS message, percobaan AS attempts`,
    [now, LEASE_MINUTES],
  )
  return rows[0] ?? null
}

/** Mengirim semua pesan yang jatuh tempo (maksimal `limit`). Mengembalikan jumlah terkirim dan gagal. */
async function processOutbox({ db, provider, clock, limit = 20, log = console.error }) {
  let sent = 0
  let failed = 0
  for (let index = 0; index < limit; index++) {
    const now = clock().toISOString()
    const item = await claimNext(db, now)
    if (!item) break

    try {
      const result = await provider.send({ to: item.recipient, message: item.message })
      await db.query(
        `UPDATE notifikasi_whatsapp SET status_kirim = 'terkirim', waktu_kirim = $2::timestamptz, ref_penyedia = $3, error_terakhir = NULL WHERE id_notifikasi = $1`,
        [item.id, now, result?.ref ?? null],
      )
      sent += 1
    } catch (error) {
      failed += 1
      const message = String(error.message ?? error).slice(0, 500)
      if (item.attempts >= MAX_ATTEMPTS) {
        await db.query(`UPDATE notifikasi_whatsapp SET status_kirim = 'gagal', error_terakhir = $2 WHERE id_notifikasi = $1`, [item.id, message])
        log(`[whatsapp] pesan #${item.id} gagal permanen setelah ${item.attempts} percobaan: ${message}`)
      } else {
        const wait = BACKOFF_SECONDS[Math.min(item.attempts - 1, BACKOFF_SECONDS.length - 1)]
        await db.query(
          `UPDATE notifikasi_whatsapp SET jadwal_kirim = $2::timestamptz + make_interval(secs => $3), error_terakhir = $4 WHERE id_notifikasi = $1`,
          [item.id, now, wait, message],
        )
        log(`[whatsapp] pesan #${item.id} gagal (percobaan ${item.attempts}), dicoba lagi ${wait} detik lagi: ${message}`)
      }
    }
  }
  return { sent, failed }
}

/** Memuat booking-booking tertentu (dto + id + nomor tujuan) untuk dibuatkan pesan. */
async function loadBookings(tx, ids, settings) {
  const { rows } = await tx.query(`${SELECT_BOOKING} WHERE b.id_booking = ANY($1::bigint[]) ORDER BY b.id_booking`, [ids])
  return rows.map((row) => ({ id: row.id, phone: row.no_whatsapp, dto: { ...toDto(row, settings), cancelReason: row.alasan_batal ?? undefined } }))
}

/**
 * Booking yang statusnya baru diubah menjadi "dikonfirmasi" (oleh admin di web internal, setelah DP diterima) dan
 * belum dikirimi bukti booking. Web internal cukup mengubah status di database; pesan dikirim dari sini.
 */
async function scanConfirmedBookings({ db, clock, webUrl }) {
  const settings = await loadSettings(db)
  return db.transaction(async (tx) => {
    const pending = await tx.query(
      `SELECT b.id_booking::int AS id FROM booking b
        WHERE b.status_booking = 'dikonfirmasi'
          AND NOT EXISTS (SELECT 1 FROM notifikasi_whatsapp n WHERE n.id_booking = b.id_booking AND n.jenis_pesan = 'bukti_booking')
        ORDER BY b.id_booking FOR UPDATE OF b SKIP LOCKED`,
    )
    if (pending.rows.length === 0) return 0
    const now = clock().toISOString()
    for (const booking of await loadBookings(tx, pending.rows.map((row) => row.id), settings)) {
      await enqueueMessage(tx, { bookingId: booking.id, kind: 'bukti_booking', phone: booking.phone, reservation: booking.dto, settings, webUrl, now })
    }
    return pending.rows.length
  })
}

/** Nomor invoice: INV-YYYYMMDD-NNNN (urutan per hari). */
function invoiceNumber(shopDate, sequence) {
  return `INV-${shopDate.replace(/-/g, '')}-${String(sequence).padStart(4, '0')}`
}

/**
 * Pelunasan yang baru dicatat "dibayar" (oleh admin) dan belum punya invoice: terbitkan invoice (satu per booking,
 * dijaga unik oleh database) lalu kirim pesannya. File PDF menyusul (kolom file_pdf).
 */
async function scanSettledBookings({ db, clock, webUrl }) {
  const settings = await loadSettings(db)
  return db.transaction(async (tx) => {
    const pending = await tx.query(
      `SELECT DISTINCT b.id_booking::int AS id FROM booking b
         JOIN pembayaran p ON p.id_booking = b.id_booking AND p.jenis_pembayaran = 'pelunasan' AND p.status_pembayaran = 'dibayar'
        WHERE NOT EXISTS (SELECT 1 FROM invoice i WHERE i.id_booking = b.id_booking)
        ORDER BY 1`,
    )
    if (pending.rows.length === 0) return 0
    const now = clock().toISOString()
    const shopDate = new Intl.DateTimeFormat('en-CA', { timeZone: settings.timezone }).format(clock())
    let issued = 0
    for (const booking of await loadBookings(tx, pending.rows.map((row) => row.id), settings)) {
      const count = (await tx.query(`SELECT count(*)::int AS n FROM invoice WHERE tanggal_terbit = $1::date`, [shopDate])).rows[0].n
      const number = invoiceNumber(shopDate, count + 1)
      const created = await tx.query(
        `INSERT INTO invoice (id_booking, nomor_invoice, tanggal_terbit, total_tagihan) VALUES ($1, $2, $3::date, $4)
         ON CONFLICT DO NOTHING RETURNING id_invoice`,
        [booking.id, number, shopDate, booking.dto.price],
      )
      if (created.rows.length === 0) continue
      await enqueueMessage(tx, { bookingId: booking.id, kind: 'invoice', phone: booking.phone, reservation: booking.dto, settings, webUrl, now, extra: { invoiceNumber: number } })
      issued += 1
    }
    return issued
  })
}

/**
 * Membatalkan booking yang DP-nya tidak dibayar sampai batas waktu (slotnya dibuka) dan mengabari pelanggan.
 * Bisa dibatasi ke satu capster dan tanggal: dipakai saat ada yang memesan slot itu, supaya booking kedaluwarsa yang
 * belum sempat dibatalkan worker tidak menghalangi pemesan baru.
 */
async function expireInTx(tx, { settings, clock, webUrl, capsterId = null, date = null }) {
  const now = clock().toISOString()
  const expired = await tx.query(
    `UPDATE booking SET status_booking = 'dibatalkan', alasan_batal = 'DP tidak dibayar tepat waktu', updated_at = $1::timestamptz
      WHERE status_booking = 'menunggu_pembayaran' AND created_at <= $1::timestamptz - make_interval(mins => $2)
        AND ($3::bigint IS NULL OR id_capster = $3) AND ($4::date IS NULL OR tanggal_booking = $4::date)
      RETURNING id_booking::int AS id`,
    [now, settings.dpHoldMinutes, capsterId, date],
  )
  if (expired.rows.length === 0) return 0
  const ids = expired.rows.map((row) => row.id)
  await tx.query(`UPDATE pembayaran SET status_pembayaran = 'kedaluwarsa' WHERE id_booking = ANY($1::bigint[]) AND jenis_pembayaran = 'dp' AND status_pembayaran = 'menunggu'`, [ids])
  for (const booking of await loadBookings(tx, ids, settings)) {
    await enqueueMessage(tx, { bookingId: booking.id, kind: 'pembatalan', phone: booking.phone, reservation: booking.dto, settings, webUrl, now })
  }
  return ids.length
}

/** Putaran worker: membatalkan semua booking yang DP-nya sudah kedaluwarsa. */
async function expireUnpaidBookings({ db, clock, webUrl }) {
  const settings = await loadSettings(db)
  return db.transaction((tx) => expireInTx(tx, { settings, clock, webUrl }))
}

/**
 * Pengingat untuk booking terkonfirmasi yang jadwalnya tinggal `reminder_minutes_before` menit lagi.
 * Tiap booking hanya sekali (pengingat_terkirim_at), dan di-reset saat jadwal diubah.
 */
async function scheduleReminders({ db, clock, webUrl }) {
  const settings = await loadSettings(db)
  if (settings.reminderMinutesBefore <= 0) return 0

  const nowLocal = nowText(settings, clock)
  return db.transaction(async (tx) => {
    const claimed = await tx.query(
      `UPDATE booking SET pengingat_terkirim_at = $3::timestamptz
        WHERE id_booking IN (SELECT id_booking FROM booking
                              WHERE status_booking = 'dikonfirmasi' AND pengingat_terkirim_at IS NULL
                                AND (tanggal_booking + jam_mulai) > $1::timestamp
                                AND (tanggal_booking + jam_mulai) <= $1::timestamp + make_interval(mins => $2)
                              FOR UPDATE SKIP LOCKED)
        RETURNING id_booking::int AS id`,
      [nowLocal, settings.reminderMinutesBefore, clock().toISOString()],
    )
    if (claimed.rows.length === 0) return 0
    const now = clock().toISOString()
    for (const booking of await loadBookings(tx, claimed.rows.map((row) => row.id), settings)) {
      await enqueueMessage(tx, { bookingId: booking.id, kind: 'pengingat', phone: booking.phone, reservation: booking.dto, settings, webUrl, now })
    }
    return claimed.rows.length
  })
}

module.exports = { enqueueMessage, processOutbox, scheduleReminders, scanConfirmedBookings, scanSettledBookings, expireInTx, expireUnpaidBookings, MAX_ATTEMPTS }
