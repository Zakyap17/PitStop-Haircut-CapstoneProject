const { normalizePhone } = require('../lib/phone')
const { SELECT_BOOKING, toDto } = require('./booking-queries')
const { consumeOtp, verifyOtp } = require('./otp')
const { loadSettings } = require('./settings')

/** Riwayat paling banyak yang dikirim sekaligus (paling baru dulu). */
const MAX_ITEMS = 100

/**
 * Riwayat booking milik satu nomor WhatsApp: tanggal, jam, layanan, kapster, gaya pilihan, harga, dan status. Wajib kode OTP dari WhatsApp
 * (nomor saja tidak cukup untuk membuka riwayat orang). Kodenya ditandai terpakai, jadi untuk membuka lagi harus minta kode baru.
 * Catatan internal admin (riwayat_layanan.catatan) sengaja tidak ikut dikirim.
 */
async function loadHistory({ db, clock }, { phone, otpCode }) {
  const { otpId } = await verifyOtp({ db, clock }, { phone, code: otpCode })
  await consumeOtp(db, otpId)

  const settings = await loadSettings(db)
  const { rows } = await db.query(
    `${SELECT_BOOKING} WHERE cu.no_whatsapp = $1 ORDER BY b.tanggal_booking DESC, b.jam_mulai DESC, b.id_booking DESC LIMIT ${MAX_ITEMS}`,
    [normalizePhone(phone)],
  )
  return { customerName: rows[0]?.nama_customer ?? null, bookings: rows.map((row) => toDto(row, settings)) }
}

module.exports = { loadHistory }
