const { cached } = require('../lib/ttl-cache')

/** Pengaturan toko dari tabel settings, sudah diubah ke tipe yang dipakai kode. Di-cache 20 detik untuk database jauh. */
async function loadSettings(db) {
  const { rows } = await cached(db, 'settings', 20_000, () => db.query('SELECT key, value FROM settings'))
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
    maxActivePerCustomer: number('max_active_per_customer', 3),
    dpHoldMinutes: number('dp_hold_minutes', 120),
    dpDefaultNominal: number('dp_default_nominal', 25000),
    dpInstruksi: text('dp_instruksi', ''),
    shopName: text('shop_name', 'Pit Stop Barbershop'),
    shopAddress: text('shop_address', ''),
    shopMapsUrl: text('shop_maps_url', ''),
    reminderMinutesBefore: number('reminder_minutes_before', 120),
  }
}

module.exports = { loadSettings }
