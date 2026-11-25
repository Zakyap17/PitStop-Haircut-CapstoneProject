const { maskPhone } = require('../lib/phone')
const { nowInZone, toTime } = require('../lib/time')

/** Kolom reservasi untuk dikirim ke klien dan untuk membuat isi pesan WhatsApp. */
const SELECT_RESERVATION = `
  SELECT r.id, r.code, r.service_id, r.service_name, r.duration_minutes, r.price,
         r.barber_id, b.name AS barber_name,
         to_char(r.starts_at, 'YYYY-MM-DD') AS date,
         to_char(r.starts_at, 'HH24:MI')    AS time,
         to_char(r.starts_at, 'YYYY-MM-DD HH24:MI') AS starts_text,
         r.customer_name, r.customer_email, r.customer_phone, r.hairstyle, r.status, r.reschedule_count, r.created_at,
         (SELECT n.status FROM notifications n WHERE n.reservation_id = r.id AND n.kind = 'created' ORDER BY n.id DESC LIMIT 1) AS invoice_status
    FROM reservations r
    JOIN barbers b ON b.id = r.barber_id`

function toDto(row) {
  return {
    code: row.code,
    serviceId: row.service_id,
    serviceName: row.service_name,
    durationMinutes: row.duration_minutes,
    price: row.price,
    barberId: row.barber_id,
    barberName: row.barber_name,
    date: row.date,
    time: row.time,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    hairstyle: row.hairstyle ?? undefined,
    status: row.status,
    rescheduleCount: row.reschedule_count,
    createdAt: new Date(row.created_at).toISOString(),
    // Nomor tujuan invoice disamarkan; status: pending (antre), sent (terkirim), failed (gagal), atau tidak ada.
    invoice: row.customer_phone ? { to: maskPhone(row.customer_phone), status: row.invoice_status ?? 'pending' } : null,
  }
}

/** Waktu sekarang di zona toko sebagai teks "YYYY-MM-DD HH:MM", bisa dibandingkan langsung dengan starts_text. */
function nowText(settings, clock) {
  const now = nowInZone(settings.timezone, clock())
  return `${now.date} ${toTime(now.minutes)}`
}

/** Berapa menit lagi dari sekarang sampai "YYYY-MM-DD HH:MM" (waktu toko). Negatif kalau sudah lewat. */
function minutesUntil(startsText, settings, clock) {
  const [date, time] = startsText.split(' ')
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const now = nowInZone(settings.timezone, clock())
  const [nowYear, nowMonth, nowDay] = now.date.split('-').map(Number)
  const startMs = Date.UTC(year, month - 1, day, hours, minutes)
  const nowMs = Date.UTC(nowYear, nowMonth - 1, nowDay, Math.floor(now.minutes / 60), now.minutes % 60)
  return Math.round((startMs - nowMs) / 60_000)
}

module.exports = { SELECT_RESERVATION, toDto, nowText, minutesUntil }
