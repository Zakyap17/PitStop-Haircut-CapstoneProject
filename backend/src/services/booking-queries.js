const { maskPhone } = require('../lib/phone')
const { nowInZone, toTime } = require('../lib/time')

/** Status booking yang menahan slot capster. */
const ACTIVE_STATUSES = ['menunggu_pembayaran', 'dikonfirmasi', 'sedang_dilayani', 'selesai']

/**
 * Satu booking lengkap (customer, capster, layanan pertama, status DP, status pesan terakhir).
 * Semua id di-cast ke int dan jam ke teks supaya sama di PostgreSQL asli dan database tertanam.
 */
const SELECT_BOOKING = `
  SELECT b.id_booking::int AS id, b.kode_booking AS code, b.status_booking AS status, b.tipe_booking,
         ca.id_capster::int AS capster_id, ca.slug AS capster_slug, ca.nama_capster,
         to_char(b.tanggal_booking, 'YYYY-MM-DD') AS date,
         to_char(b.jam_mulai, 'HH24:MI') AS time,
         to_char(b.tanggal_booking, 'YYYY-MM-DD') || ' ' || to_char(b.jam_mulai, 'HH24:MI') AS starts_text,
         (extract(epoch FROM (b.jam_selesai - b.jam_mulai)) / 60)::int AS duration,
         round(b.total_harga)::int AS total, round(b.nominal_dp)::int AS dp_nominal,
         b.created_at, b.alasan_batal, b.jumlah_ubah_jadwal AS reschedule_count, b.gaya_try_on,
         cu.id_customer::int AS customer_id, cu.nama_customer, cu.no_whatsapp,
         l.slug AS service_slug, l.nama_layanan,
         (SELECT p.status_pembayaran FROM pembayaran p WHERE p.id_booking = b.id_booking AND p.jenis_pembayaran = 'dp'
           ORDER BY p.id_pembayaran DESC LIMIT 1) AS dp_status,
         (SELECT n.status_kirim FROM notifikasi_whatsapp n WHERE n.id_booking = b.id_booking
           ORDER BY n.id_notifikasi DESC LIMIT 1) AS wa_status
    FROM booking b
    JOIN customer cu ON cu.id_customer = b.id_customer
    JOIN capster ca ON ca.id_capster = b.id_capster
    LEFT JOIN LATERAL (
      SELECT ly.slug, ly.nama_layanan FROM booking_layanan bl JOIN layanan ly ON ly.id_layanan = bl.id_layanan
       WHERE bl.id_booking = b.id_booking ORDER BY bl.id_detail LIMIT 1
    ) l ON true`

const WA_STATUS = { menunggu: 'pending', terkirim: 'sent', gagal: 'failed' }

/** Bentuk booking yang dikirim ke web customer. */
function toDto(row, settings) {
  const waiting = row.status === 'menunggu_pembayaran'
  const payBefore = waiting ? new Date(new Date(row.created_at).getTime() + settings.dpHoldMinutes * 60_000).toISOString() : null
  return {
    code: row.code,
    serviceId: row.service_slug ?? null,
    serviceName: row.nama_layanan ?? 'Layanan',
    durationMinutes: row.duration,
    price: row.total,
    barberId: row.capster_slug ?? String(row.capster_id),
    barberName: row.nama_capster,
    date: row.date,
    time: row.time,
    customerName: row.nama_customer,
    customerPhone: row.no_whatsapp,
    hairstyle: row.gaya_try_on ?? undefined,
    status: row.status,
    rescheduleCount: row.reschedule_count,
    createdAt: new Date(row.created_at).toISOString(),
    // DP: nominal, status pembayarannya (menunggu / dibayar / gagal / kedaluwarsa), batas bayar, dan cara bayar.
    dp: { nominal: row.dp_nominal, status: row.dp_status ?? null, payBefore, instruction: settings.dpInstruksi || null },
    // Pesan WhatsApp terakhir untuk booking ini: nomor tersamar dan statusnya.
    whatsapp: row.wa_status ? { to: maskPhone(row.no_whatsapp), status: WA_STATUS[row.wa_status] ?? 'pending' } : null,
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

module.exports = { ACTIVE_STATUSES, SELECT_BOOKING, toDto, nowText, minutesUntil }
