const express = require('express')
const { loadSettings } = require('../services/settings')

/** Data yang dipakai halaman customer, dari tabel resmi: layanan, capster, galeri, plus testimoni dan aturan booking. */
async function loadCatalog(db) {
  const [settings, services, barbers, haircuts, testimonials, slots] = await Promise.all([
    loadSettings(db),
    db.query(
      `SELECT slug, nama_layanan, deskripsi, round(harga)::int AS harga, durasi_menit FROM layanan
        WHERE status_aktif AND slug IS NOT NULL ORDER BY id_layanan`,
    ),
    db.query(
      `SELECT slug, nama_capster, jabatan, spesialisasi, pengalaman_tahun, hari_libur FROM capster
        WHERE status_aktif AND slug IS NOT NULL ORDER BY id_capster`,
    ),
    db.query(
      `SELECT g.slug, g.judul, g.kategori, g.file_gambar, c.slug AS capster_slug, c.nama_capster
         FROM galeri g JOIN capster c ON c.id_capster = g.id_capster
        WHERE g.slug IS NOT NULL AND c.status_aktif ORDER BY g.urutan, g.id_galeri`,
    ),
    db.query('SELECT quote, name, role, image_path FROM testimonials WHERE is_active ORDER BY sort_order, id'),
    db.query('SELECT time FROM booking_slots WHERE is_active ORDER BY time'),
  ])

  return {
    services: services.rows.map((row) => ({ id: row.slug, name: row.nama_layanan, description: row.deskripsi ?? '', price: row.harga, durationMinutes: row.durasi_menit })),
    barbers: barbers.rows.map((row) => ({
      id: row.slug,
      name: row.nama_capster,
      role: row.jabatan ?? 'Capster',
      specialty: row.spesialisasi ?? '',
      experienceYears: row.pengalaman_tahun ?? null,
      offDays: row.hari_libur,
    })),
    haircuts: haircuts.rows.map((row) => ({
      id: row.slug,
      name: row.judul,
      barberId: row.capster_slug,
      barber: row.nama_capster,
      category: row.kategori ?? 'Lainnya',
      image: row.file_gambar,
    })),
    testimonials: testimonials.rows.map((row) => ({ quote: row.quote, name: row.name, role: row.role, image: row.image_path })),
    booking: {
      timezone: settings.timezone,
      opensAt: settings.opensAt,
      closesAt: settings.closesAt,
      breakFrom: settings.breakFrom || null,
      breakTo: settings.breakTo || null,
      daysAhead: settings.bookingDaysAhead,
      maxReschedules: settings.maxReschedules,
      timeSlots: slots.rows.map((row) => row.time),
    },
  }
}

function catalogRouter({ db }) {
  const router = express.Router()
  router.get('/catalog', async (req, res) => {
    // Boleh di-cache sebentar oleh Next/CDN; perubahan dari admin terlihat dalam semenit.
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    res.json(await loadCatalog(db))
  })
  return router
}

module.exports = { catalogRouter, loadCatalog }
