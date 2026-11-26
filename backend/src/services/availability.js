const { capsterKey, capsterOffDays, serviceKey } = require('../db/keys')
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

/** Panjang satu slot (menit): selisih terkecil antar jam mulai berurutan, mis. slot per jam = 60. */
function slotLengthMinutes(slotTimes) {
  const starts = slotTimes.map(toMinutes).sort((a, b) => a - b)
  let smallest = Infinity
  for (let i = 1; i < starts.length; i += 1) if (starts[i] > starts[i - 1]) smallest = Math.min(smallest, starts[i] - starts[i - 1])
  return Number.isFinite(smallest) ? smallest : 60
}

/**
 * Waktu yang ditahan untuk satu layanan: durasinya dibulatkan ke atas ke kelipatan satu slot.
 * Contoh slot per jam: potong 45 menit menahan 1 slot (60 menit), hair coloring 90 menit menahan 2 slot (120 menit).
 */
function reserveMinutes(duration, slotLength) {
  return Math.max(1, Math.ceil(duration / slotLength)) * slotLength
}

/** Waktu yang ditahan (menit) untuk layanan berdurasi `duration`, memakai jam slot yang berlaku sekarang. */
async function loadReservedMinutes(db, duration) {
  return reserveMinutes(duration, slotLengthMinutes(await loadSlotTimes(db)))
}

/** Layanan aktif berdasarkan kunci (id di web). */
async function loadService(db, key) {
  const { rows } = await db.query(
    `SELECT * FROM (
       SELECT l.id_layanan::int AS id, ${serviceKey('l')} AS slug, l.nama_layanan AS name, round(l.harga)::int AS price, l.durasi_menit AS duration
         FROM layanan l WHERE l.status_aktif
     ) service WHERE slug = $1`,
    [key],
  )
  if (rows.length === 0) throw notFound('Layanan tidak ditemukan.')
  return rows[0]
}

/** Capster aktif, berurutan menurut id. */
async function loadCapsters(db) {
  const { rows } = await db.query(
    `SELECT c.id_capster::int AS id, ${capsterKey('c')} AS slug, c.nama_capster AS name, ${capsterOffDays('c')} AS off_days
       FROM capster c WHERE c.status_aktif ORDER BY c.id_capster`,
  )
  return rows
}

async function loadCapsterBySlug(db, key) {
  const { rows } = await db.query(
    `SELECT * FROM (
       SELECT c.id_capster::int AS id, ${capsterKey('c')} AS slug, c.nama_capster AS name, ${capsterOffDays('c')} AS off_days
         FROM capster c WHERE c.status_aktif
     ) capster WHERE slug = $1`,
    [key],
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

  // Slot yang ditahan = durasi dibulatkan ke atas ke kelipatan satu slot (hair coloring 90 menit menahan 2 slot per jam).
  const slotLength = slotLengthMinutes(slotTimes)
  const reservedMinutes = reserveMinutes(service.duration, slotLength)
  const slots = slotTimes.map((time) => {
    const startMinutes = toMinutes(time)
    const open = fitsShopHours({ startMinutes, duration: reservedMinutes, date, settings, clock })
    const barbers = open
      ? capsters.filter((capster) => isCapsterFree({ capster, date, startMinutes, duration: reservedMinutes, busy, schedules })).map((capster) => capster.slug)
      : []
    return { time: toTime(startMinutes), barbers }
  })

  return { date, serviceId: service.slug, durationMinutes: service.duration, reservedMinutes, slotsNeeded: reservedMinutes / slotLength, slots }
}

module.exports = {
  assertBookableDate,
  loadSlotTimes,
  loadReservedMinutes,
  loadService,
  loadCapsters,
  loadCapsterBySlug,
  loadSchedules,
  loadBusyIntervals,
  fitsShopHours,
  isCapsterFree,
  getAvailability,
}
