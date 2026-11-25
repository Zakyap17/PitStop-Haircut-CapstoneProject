const { badRequest, notFound } = require('../lib/errors')
const { addDays, isValidIsoDate, nowInZone, toMinutes, toTime, weekdayOf } = require('../lib/time')

/** Aturan hari dan jam yang boleh dipesan. Satu sumber kebenaran, dipakai juga saat membuat dan mengubah reservasi. */
function assertBookableDate(date, settings, clock) {
  if (!isValidIsoDate(date)) throw badRequest('invalid_date', 'Tanggal tidak valid.')
  const today = nowInZone(settings.timezone, clock()).date
  const last = addDays(today, settings.bookingDaysAhead - 1)
  if (date < today || date > last) {
    throw badRequest('date_out_of_range', `Reservasi hanya bisa untuk ${settings.bookingDaysAhead} hari ke depan, mulai hari ini.`)
  }
}

/** Slot waktu aktif, berurutan. */
async function loadSlotTimes(db) {
  const { rows } = await db.query('SELECT time FROM booking_slots WHERE is_active ORDER BY time')
  return rows.map((row) => row.time)
}

async function loadService(db, serviceId) {
  const { rows } = await db.query('SELECT id, name, price, duration_minutes FROM services WHERE id = $1 AND is_active', [serviceId])
  if (rows.length === 0) throw notFound('Layanan tidak ditemukan.')
  return rows[0]
}

/** Reservasi aktif (menahan slot) pada satu tanggal. `excludeCode` dipakai saat mengubah jadwal agar tidak bentrok dengan dirinya sendiri. */
async function loadBusyIntervals(db, date, excludeCode = null) {
  const { rows } = await db.query(
    `SELECT barber_id,
            to_char(starts_at, 'HH24:MI') AS start_time,
            to_char(ends_at,   'HH24:MI') AS end_time
       FROM reservations
      WHERE starts_at >= $1::date AND starts_at < ($1::date + 1)
        AND status IN ('confirmed', 'completed')
        AND ($2::text IS NULL OR code <> $2)`,
    [date, excludeCode],
  )
  return rows.map((row) => ({ barberId: row.barber_id, start: toMinutes(row.start_time), end: toMinutes(row.end_time) }))
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

/** Apakah kapster ini bisa melayani jam itu: masuk kerja hari itu dan tidak bentrok dengan reservasi lain. */
function isBarberFree({ barber, date, startMinutes, duration, busy }) {
  if (barber.off_days.includes(weekdayOf(date))) return false
  const endMinutes = startMinutes + duration
  return !busy.some((item) => item.barberId === barber.id && startMinutes < item.end && endMinutes > item.start)
}

/**
 * Ketersediaan satu hari untuk satu layanan: untuk tiap slot, daftar kapster yang bisa melayani.
 * Slot tanpa kapster tetap dikirim (barbers kosong) supaya tampilan bisa menandainya penuh.
 */
async function getAvailability({ db, settings, clock }, { date, serviceId }) {
  assertBookableDate(date, settings, clock)
  const service = await loadService(db, serviceId)
  const [slotTimes, busy, barbersResult] = await Promise.all([
    loadSlotTimes(db),
    loadBusyIntervals(db, date),
    db.query('SELECT id, off_days FROM barbers WHERE is_active ORDER BY sort_order'),
  ])

  const slots = slotTimes.map((time) => {
    const startMinutes = toMinutes(time)
    const open = fitsShopHours({ startMinutes, duration: service.duration_minutes, date, settings, clock })
    const barbers = open
      ? barbersResult.rows
          .filter((barber) => isBarberFree({ barber, date, startMinutes, duration: service.duration_minutes, busy }))
          .map((barber) => barber.id)
      : []
    return { time: toTime(startMinutes), barbers }
  })

  return { date, serviceId: service.id, durationMinutes: service.duration_minutes, slots }
}

module.exports = { assertBookableDate, loadSlotTimes, loadService, loadBusyIntervals, fitsShopHours, isBarberFree, getAvailability }
