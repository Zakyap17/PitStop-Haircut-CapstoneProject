const crypto = require('node:crypto')
const { HttpError, badRequest } = require('../lib/errors')
const { maskPhone, normalizePhone } = require('../lib/phone')
const { loadSettings } = require('./settings')

/** Aturan OTP: kode 6 digit berlaku 5 menit, boleh salah 5 kali, minta ulang paling cepat tiap 60 detik, dan paling banyak 3 kali per 10 menit. */
const TTL_SECONDS = 5 * 60
const RESEND_COOLDOWN_SECONDS = 60
const MAX_REQUESTS = 3
const REQUEST_WINDOW_SECONDS = 10 * 60
const MAX_ATTEMPTS = 5
/** Batas menunggu pengiriman WhatsApp sebelum jawaban dikirim ke pelanggan (milidetik). */
const SEND_WAIT_MS = 3000

// Pepper untuk hash kode. Kalau OTP_SECRET tidak diisi, dibuat acak tiap backend menyala (kode yang sedang beredar ikut tidak berlaku, tidak masalah
// karena umurnya hanya 5 menit).
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex')

function hashCode(customerId, code) {
  return crypto.createHmac('sha256', process.env.OTP_SECRET || FALLBACK_SECRET).update(`${customerId}:${code}`).digest('hex')
}

function safeEqual(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

const tooMany = (code, message) => new HttpError(429, code, message)

/** Isi pesan WhatsApp. Kode hanya ada di pesan ini dan di hash database. */
function otpMessage({ code, shopName }) {
  return [
    `*KODE VERIFIKASI*`,
    shopName,
    '',
    `Kode OTP kamu: *${code}*`,
    `Berlaku ${TTL_SECONDS / 60} menit dan hanya bisa dipakai sekali.`,
    '',
    `Jangan bagikan kode ini ke siapa pun, termasuk yang mengaku dari ${shopName}. Kalau kamu tidak sedang memesan, abaikan pesan ini.`,
  ].join('\n')
}

/**
 * Meminta kode OTP untuk nomor WhatsApp: membuat baris customer kalau belum ada, menyimpan hash kode di otp_riwayat, lalu mengirim kodenya
 * ke WhatsApp nomor itu. Pengiriman gagal = baris kode dibatalkan supaya jeda kirim ulang tidak ikut terhitung.
 */
async function requestOtp({ db, clock, whatsappProvider, otpSendWaitMs = SEND_WAIT_MS }, { phone, customerName, purpose = 'booking' }) {
  const normalized = normalizePhone(phone)
  if (!normalized) throw badRequest('invalid_phone', 'Nomor WhatsApp tidak valid. Contoh: 081234567890.')
  if (!whatsappProvider) throw new HttpError(503, 'otp_unavailable', 'Verifikasi WhatsApp belum tersedia. Hubungi kasir.')

  const settings = await loadSettings(db)
  const now = clock()
  const masked = maskPhone(normalized)
  const windowStart = new Date(now.getTime() - REQUEST_WINDOW_SECONDS * 1000).toISOString()

  // Satu query: baris customer (dibuat kalau belum ada) beserta waktu permintaan kode di 10 menit terakhir. Di jaringan yang lambat tiap query
  // adalah satu kali bolak-balik ke database, jadi sebisa mungkin digabung.
  const recentSql = `(SELECT COALESCE(json_agg(o.dibuat_pada ORDER BY o.dibuat_pada DESC), '[]'::json) FROM otp_riwayat o WHERE o.id_customer = %ID% AND o.dibuat_pada > %WINDOW%::timestamptz)`
  let customer
  if (purpose === 'history') {
    // Melihat riwayat: kode hanya dikirim ke nomor yang pernah memesan. Nomor lain dijawab sama persis tanpa mengirim apa pun, supaya
    // halaman ini tidak bisa dipakai menebak siapa saja yang pernah jadi pelanggan atau mengirim WhatsApp ke nomor sembarang.
    customer = (
      await db.query(
        `SELECT cu.id_customer::int AS id, ${recentSql.replace('%ID%', 'cu.id_customer').replace('%WINDOW%', '$2')} AS recent
           FROM customer cu WHERE cu.no_whatsapp = $1 AND EXISTS (SELECT 1 FROM booking b WHERE b.id_customer = cu.id_customer)`,
        [normalized, windowStart],
      )
    ).rows[0]
    if (!customer) return { to: masked, expiresInSeconds: TTL_SECONDS, resendAfterSeconds: RESEND_COOLDOWN_SECONDS }
  } else {
    // Booking: baris customer dibuat kalau belum ada. Nama yang sudah tersimpan tidak diubah di sini (update yang tidak mengubah apa pun,
    // supaya baris tetap dikembalikan): nama baru baru berlaku saat booking berhasil diverifikasi.
    customer = (
      await db.query(
        `WITH c AS (
           INSERT INTO customer (nama_customer, no_whatsapp) VALUES ($1, $2)
           ON CONFLICT (no_whatsapp) DO UPDATE SET nama_customer = customer.nama_customer RETURNING id_customer
         )
         SELECT c.id_customer::int AS id, ${recentSql.replace('%ID%', 'c.id_customer').replace('%WINDOW%', '$3')} AS recent FROM c`,
        [customerName || 'Pelanggan', normalized, windowStart],
      )
    ).rows[0]
  }

  const recent = (Array.isArray(customer.recent) ? customer.recent : JSON.parse(customer.recent ?? '[]')).map((value) => new Date(value))
  if (recent.length > 0) {
    const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - (now.getTime() - recent[0].getTime()) / 1000)
    if (waitSeconds > 0) throw tooMany('otp_cooldown', `Kode baru bisa diminta ${waitSeconds} detik lagi.`)
  }
  if (recent.length >= MAX_REQUESTS) throw tooMany('otp_limit', 'Terlalu sering meminta kode. Tunggu beberapa menit lalu coba lagi.')

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  const inserted = await db.query(
    `INSERT INTO otp_riwayat (id_customer, kode_otp_hash, waktu_kadaluarsa, dibuat_pada) VALUES ($1, $2, $3::timestamptz, $4::timestamptz) RETURNING id_otp::int AS id`,
    [customer.id, hashCode(customer.id, code), new Date(now.getTime() + TTL_SECONDS * 1000).toISOString(), now.toISOString()],
  )
  const otpId = inserted.rows[0].id

  // Pengiriman WhatsApp lewat Fonnte bisa makan beberapa detik. Ditunggu sebentar supaya kegagalan cepat (mis. perangkat terputus) langsung
  // terlihat, tetapi kalau lebih lama dari batas, jawabannya dikirim dulu dan pengiriman diselesaikan di latar. Gagal belakangan = baris
  // kode dibatalkan dan dicatat di log, jadi pelanggan bisa meminta kode baru tanpa menunggu jeda.
  const sending = Promise.resolve()
    .then(() => whatsappProvider.send({ to: normalized, message: otpMessage({ code, shopName: settings.shopName }) }))
    .then(() => null, (error) => error)
  const dropCode = () => db.query('DELETE FROM otp_riwayat WHERE id_otp = $1', [otpId]).catch(() => {})
  let timer
  const outcome = await Promise.race([sending, new Promise((resolve) => (timer = setTimeout(() => resolve('pending'), otpSendWaitMs)))])
  clearTimeout(timer)
  if (outcome === 'pending') {
    void sending.then(async (error) => {
      if (!error) return
      console.error(`[otp] pengiriman WhatsApp gagal (setelah menunggu): ${error.message}`)
      await dropCode()
    })
  } else if (outcome) {
    await dropCode()
    console.error(`[otp] pengiriman WhatsApp gagal: ${outcome.message}`)
    throw new HttpError(502, 'whatsapp_failed', 'Kode gagal dikirim ke WhatsApp. Periksa nomornya, lalu coba lagi.')
  }

  return { to: masked, expiresInSeconds: TTL_SECONDS, resendAfterSeconds: RESEND_COOLDOWN_SECONDS }
}

/**
 * Memeriksa kode OTP milik nomor itu. Berhasil = mengembalikan id baris kode (belum dipakai; dipakai di dalam transaksi booking lewat
 * consumeOtp, jadi kalau booking gagal kodenya tidak hangus). Salah = jumlah percobaan bertambah dan kode dikunci setelah batas.
 */
async function verifyOtp({ db, clock }, { phone, code }) {
  const normalized = normalizePhone(phone)
  if (!normalized || !/^\d{6}$/.test(String(code ?? ''))) throw badRequest('otp_required', 'Masukkan kode verifikasi 6 digit dari WhatsApp.')

  const row = (
    await db.query(
      `SELECT o.id_otp::int AS id, o.id_customer::int AS customer_id, o.kode_otp_hash AS hash, o.waktu_kadaluarsa AS expires_at, o.percobaan AS attempts
         FROM otp_riwayat o JOIN customer c ON c.id_customer = o.id_customer
        WHERE c.no_whatsapp = $1 AND NOT o.status_pakai ORDER BY o.id_otp DESC LIMIT 1`,
      [normalized],
    )
  ).rows[0]

  if (!row) throw badRequest('otp_required', 'Minta kode verifikasi dulu, lalu masukkan kode yang dikirim ke WhatsApp.')
  if (new Date(row.expires_at).getTime() <= clock().getTime()) throw badRequest('otp_expired', 'Kode sudah kedaluwarsa. Minta kode baru.')
  if (row.attempts >= MAX_ATTEMPTS) throw tooMany('otp_attempts', 'Terlalu banyak salah memasukkan kode. Minta kode baru.')

  if (!safeEqual(hashCode(row.customer_id, code), row.hash)) {
    const updated = await db.query('UPDATE otp_riwayat SET percobaan = percobaan + 1 WHERE id_otp = $1 RETURNING percobaan AS attempts', [row.id])
    const left = MAX_ATTEMPTS - updated.rows[0].attempts
    if (left <= 0) throw tooMany('otp_attempts', 'Terlalu banyak salah memasukkan kode. Minta kode baru.')
    throw badRequest('otp_invalid', `Kode salah. Sisa percobaan: ${left}.`)
  }
  return { otpId: row.id, customerId: row.customer_id }
}

/** Menandai kode terpakai, dipanggil di dalam transaksi booking. Mengembalikan false kalau kode ternyata sudah dipakai permintaan lain. */
async function consumeOtp(tx, otpId) {
  const result = await tx.query('UPDATE otp_riwayat SET status_pakai = true WHERE id_otp = $1 AND NOT status_pakai RETURNING id_otp', [otpId])
  return result.rows.length === 1
}

module.exports = { requestOtp, verifyOtp, consumeOtp, otpMessage, TTL_SECONDS, RESEND_COOLDOWN_SECONDS, MAX_ATTEMPTS }
