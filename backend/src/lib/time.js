/** Fungsi waktu. Semua jam toko dihitung di zona waktu toko (Asia/Jakarta), bukan zona waktu server. */

/** "HH:MM" -> menit sejak tengah malam. */
function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** Menit sejak tengah malam -> "HH:MM". */
function toTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Tanggal dan jam saat ini di zona waktu toko: { date: 'YYYY-MM-DD', minutes }. */
function nowInZone(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type) => parts.find((part) => part.type === type).value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Apakah string ini tanggal kalender yang benar ("2026-02-30" ditolak). */
function isValidIsoDate(value) {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** Menambah hari ke tanggal "YYYY-MM-DD". */
function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Hari dalam seminggu untuk tanggal "YYYY-MM-DD": 0 = Minggu ... 6 = Sabtu. */
function weekdayOf(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

module.exports = { toMinutes, toTime, nowInZone, isValidIsoDate, addDays, weekdayOf }
