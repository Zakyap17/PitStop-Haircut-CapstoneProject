const { badRequest, notFound } = require('../lib/errors')
const { addDays, isValidIsoDate, nowInZone, toMinutes, toTime, weekdayOf } = require('../lib/time')
const { ACTIVE_STATUSES } = require('./booking-queries')

/** Aturan hari yang boleh dipesan. Satu sumber kebenaran, dipakai juga saat membuat dan mengubah booking. */
function assertBookableDate(date, settings, clock) {
  if (!isValidIsoDate(date)) throw badRequest('invalid_date', 'Tanggal tidak valid.')
  const today = nowInZone(settings.timezone, clock()).date
  const last = addDays(today, settings.bookingDaysAhead - 1)
  if (date < today || date > last) {
    throw badRequest('date_out_of_range', `Booking hanya bisa untuk ${settings.bookingDaysAhead} hari ke depan, mulai hari ini.`)
  }
}

/** Jam mulai yang bisa dipesan, berurutan. */
async function loadSlotTimes(db) {
  const { rows } = await db.query('SELECT time FROM booking_slots WHERE is_active ORDER BY time')
  return rows.map((row) => row.time)
}

/** Layanan aktif berdasarkan slug (id di web). */
async function loadService(db, slug) {
  const { rows } = await db.query(
    `SELECT id_layanan::int AS id, slug, nama_layanan AS name, round(harga)::int AS price, durasi_menit AS duration
       FROM layanan WHERE slug = $1 AND status_aktif`,
    [slug],
  )
  if (rows.length === 0) throw notFound('Layanan tidak ditemukan.')
  return rows[0]
}

/** Capster aktif, berurutan menurut id. */
async function loadCapsters(db) {
  const { rows } = await db.query(
    `SELECT id_capster::int AS id, slug, nama_capster AS name, hari_libur AS off_days
       FROM capster WHERE status_aktif AND slug IS NOT NULL ORDER BY id_capster`,
  )
  return rows
}

async function loadCapsterBySlug(db, slug) {
  const { rows } = await db.query(
    `SELECT id_capster::int AS id, slug, nama_capster AS name, hari_libur AS off_days
       FROM capster WHERE slug = $1 AND status_aktif`,
    [slug],
  )
  if (rows.length === 0) throw notFound('Kapster tidak ditemukan.')
  return rows[0]
}

/** Jadwal kerja capster pada satu tanggal (tabel jadwal_capster): { capsterId: [{ start, end, status }] }. */
async function loadSchedules(db, date) {
  const { rows } = await db.query(
    `SELECT id_capster::int AS capster_id, to_char(jam_mulai, 'HH24:MI') AS s, to_char(jam_selesai, 'HH24:MI') AS e, status_slot AS status
       FROM jadwal_capster WHERE tanggal = $1::date`,
    [date],
  )
  const byCapster = {}
  for (const row of rows) (byCapster[row.capster_id] ??= []).push({ start: toMinutes(row.s), end: toMinutes(row.e), status: row.status })
  return byCapster
}

/**
 * Booking yang menahan slot pada satu tanggal. Booking yang masih menunggu DP hanya menahan slot selama
 * dp_hold_minutes; lewat itu slotnya dianggap kosong (dan booking-nya dibatalkan oleh worker).
 */
async function loadBusyIntervals(db, date, { settings, clock, excludeCode = null }) {
  const { rows } = await db.query(
    `SELECT id_capster::int AS capster_id, to_char(jam_mulai, 'HH24:MI') AS s, to_char(jam_selesai, 'HH24:MI') AS e
       FROM booking
      WHERE tanggal_booking = $1::date
        AND status_booking = ANY($2::text[])
        AND (status_booking <> 'menunggu_pembayaran' OR created_at > $3::timestamptz - make_interval(mins => $4))
        AND ($5::text IS NULL OR kode_booking <> $5)`,
    [date, ACTIVE_STATUSES, clock().toISOString(), settings.dpHoldMinutes, excludeCode],
  )
  return rows.map((row) => ({ capsterId: row.capster_id, start: toMinutes(row.s), end: toMinutes(row.e) }))
}

/** Apakah layanan berdurasi `duration` yang mulai pukul `startMinutes` muat di jam toko, tidak menabrak istirahat, dan belum lewat. */
function fitsShopHours({ startMinutes, duration, date, settings, clock }) {
  const endMinutes = startMinutes + duration
  if (startMinutes < toMinutes(settings.opensAt) || endMinutes > toMinutes(settings.closesAt)) return false

  if (settings.breakFrom && settings.breakTo) {
    const breakFrom = toMinutes(settings.breakFrom)
    const breakTo = toMinutes(settings.breakTo)
    if (startMinutes < breakTo && endMinutes > breakFrom) return false
  }

  const now = nowInZone(settings.timezone, clock())
  if (date === now.date && startMinutes <= now.minutes + settings.minLeadMinutes) return false
  return true
}

/**
 * Apakah capster ini bisa melayani jam itu.
 * Jam kerja: kalau capster punya baris di jadwal_capster untuk tanggal itu, hanya jam berstatus "tersedia" yang berlaku
 * ("libur" atau tidak ada yang cocok = tidak bisa). Kalau tidak punya baris, ikut jam buka toko dan hari libur mingguan bawaannya.
 */
function isCapsterFree({ capster, date, startMinutes, duration, busy, schedules }) {
  const endMinutes = startMinutes + duration
  const windows = schedules[capster.id] ?? []
  const working =
    windows.length > 0
      ? windows.some((window) => window.status === 'tersedia' && startMinutes >= window.start && endMinutes <= window.end)
      : !capster.off_days.includes(weekdayOf(date))
  if (!working) return false
  return !busy.some((item) => item.capsterId === capster.id && startMinutes < item.end && endMinutes > item.start)
}

/**
 * Ketersediaan satu hari untuk satu layanan: untuk tiap jam, daftar capster (slug) yang bisa melayani.
 * Jam tanpa capster tetap dikirim (barbers kosong) supaya tampilan bisa menandainya penuh.
 */
async function getAvailability({ db, settings, clock }, { date, serviceId }) {
  assertBookableDate(date, settings, clock)
  const service = await loadService(db, serviceId)
  const [slotTimes, capsters, schedules, busy] = await Promise.all([
    loadSlotTimes(db),
    loadCapsters(db),
    loadSchedules(db, date),
    loadBusyIntervals(db, date, { settings, clock }),
  ])

  const slots = slotTimes.map((time) => {
    const startMinutes = toMinutes(time)
    const open = fitsShopHours({ startMinutes, duration: service.duration, date, settings, clock })
    const barbers = open
      ? capsters.filter((capster) => isCapsterFree({ capster, date, startMinutes, duration: service.duration, busy, schedules })).map((capster) => capster.slug)
      : []
    return { time: toTime(startMinutes), barbers }
  })

  return { date, serviceId: service.slug, durationMinutes: service.duration, slots }
}

module.exports = {
  assertBookableDate,
  loadSlotTimes,
  loadService,
  loadCapsters,
  loadCapsterBySlug,
  loadSchedules,
  loadBusyIntervals,
  fitsShopHours,
  isCapsterFree,
  getAvailability,
}
