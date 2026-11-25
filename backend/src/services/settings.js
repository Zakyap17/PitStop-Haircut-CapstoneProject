/** Pengaturan toko dari tabel settings, sudah diubah ke tipe yang dipakai kode. */
async function loadSettings(db) {
  const { rows } = await db.query('SELECT key, value FROM settings')
  const raw = Object.fromEntries(rows.map((row) => [row.key, row.value]))

  const text = (key, fallback) => (raw[key] === undefined ? fallback : raw[key])
  const number = (key, fallback) => (Number.isFinite(Number(raw[key])) && raw[key] !== '' ? Number(raw[key]) : fallback)

  return {
    timezone: text('timezone', 'Asia/Jakarta'),
    opensAt: text('opens_at', '10:00'),
    closesAt: text('closes_at', '21:00'),
    // String kosong = tidak ada istirahat.
    breakFrom: text('break_from', ''),
    breakTo: text('break_to', ''),
    bookingDaysAhead: number('booking_days_ahead', 7),
    maxReschedules: number('max_reschedules', 2),
    minLeadMinutes: number('min_lead_minutes', 0),
    maxActivePerEmail: number('max_active_per_email', 3),
  }
}

module.exports = { loadSettings }
