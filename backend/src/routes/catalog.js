const express = require('express')
const { loadSettings } = require('../services/settings')

/** Data yang dipakai halaman customer: layanan, kapster, gaya rambut, testimoni, dan aturan reservasi. */
async function loadCatalog(db) {
  const [settings, services, barbers, haircuts, testimonials, slots] = await Promise.all([
    loadSettings(db),
    db.query('SELECT id, name, description, price, duration_minutes FROM services WHERE is_active ORDER BY sort_order, name'),
    db.query('SELECT id, name, role, specialty, experience_years, off_days FROM barbers WHERE is_active ORDER BY sort_order, name'),
    db.query(
      `SELECT h.id, h.name, h.barber_id, b.name AS barber_name, h.category, h.rating::float AS rating, h.image_path
         FROM haircuts h JOIN barbers b ON b.id = h.barber_id
        WHERE h.is_active ORDER BY h.sort_order, h.name`,
    ),
    db.query('SELECT quote, name, role, image_path FROM testimonials WHERE is_active ORDER BY sort_order, id'),
    db.query('SELECT time FROM booking_slots WHERE is_active ORDER BY time'),
  ])

  return {
    services: services.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      durationMinutes: row.duration_minutes,
    })),
    barbers: barbers.rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      specialty: row.specialty,
      experienceYears: row.experience_years,
      offDays: row.off_days,
    })),
    haircuts: haircuts.rows.map((row) => ({
      id: row.id,
      name: row.name,
      barberId: row.barber_id,
      barber: row.barber_name,
      category: row.category,
      rating: row.rating,
      image: row.image_path,
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
    // Boleh di-cache sebentar oleh Next/CDN; admin yang mengubah menu akan terlihat dalam semenit.
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    res.json(await loadCatalog(db))
  })
  return router
}

module.exports = { catalogRouter, loadCatalog }
