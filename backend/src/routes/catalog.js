const express = require('express')
const { capsterAvailable, capsterExperience, capsterKey, capsterOffDays, capsterRole, galleryKey, serviceKey } = require('../db/keys')
const { loadSettings } = require('../services/settings')

/** Gaya rambut di galeri (dipakai katalog dan analisa try-on AI). */
async function loadHaircuts(db) {
  const { rows } = await db.query(
    // Gaya tetap tampil walau capster-nya sudah diarsipkan: foto referensi gaya tidak bergantung pada status capster.
    `SELECT ${galleryKey('g')} AS slug, g.judul, g.kategori, g.file_gambar, ${capsterKey('c')} AS capster_slug, c.nama_capster
       FROM galeri g JOIN capster c ON c.id_capster = g.id_capster
      ORDER BY g.urutan, g.id_galeri`,
  )
  return rows.map((row) => ({
    id: row.slug,
    name: row.judul,
    barberId: row.capster_slug,
    barber: row.nama_capster,
    category: row.kategori ?? 'Lainnya',
    image: row.file_gambar,
  }))
}

/** Data yang dipakai halaman customer, dari tabel resmi: layanan, capster, galeri, plus testimoni dan aturan booking. */
const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/

/**
 * Alamat foto capster untuk web. Foto yang disimpan sebagai data URL (hasil unggahan dari sisi admin) tidak ikut dikirim di
 * katalog karena berat; web memuatnya dari /api/barbers/:id/photo. Foto berupa path atau tautan dipakai apa adanya.
 */
function photoUrl(slug, foto) {
  if (!foto) return null
  if (/^data:image\//.test(foto)) return `/api/barbers/${encodeURIComponent(slug)}/photo`
  if (/^(https?:)?\/\//.test(foto) || foto.startsWith('/')) return foto
  return null
}

async function loadCatalog(db, { otpRequired = false } = {}) {
  const [settings, services, barbers, haircuts, testimonials, slots] = await Promise.all([
    loadSettings(db),
    db.query(
      `SELECT ${serviceKey('l')} AS slug, l.nama_layanan, l.deskripsi, round(l.harga)::int AS harga, l.durasi_menit FROM layanan l
        WHERE l.status_aktif ORDER BY l.id_layanan`,
    ),
    db.query(
      `SELECT ${capsterKey('c')} AS slug, c.nama_capster, ${capsterRole('c')} AS jabatan, c.spesialisasi,
              ${capsterExperience('c')} AS pengalaman_tahun, ${capsterOffDays('c')} AS hari_libur, c.foto, ${capsterAvailable('c')} AS tersedia
         FROM capster c WHERE c.status_aktif ORDER BY c.id_capster`,
    ),
    loadHaircuts(db),
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
      photo: photoUrl(row.slug, row.foto),
      // Saklar dari admin: false = tetap tampil tetapi tidak bisa dipilih (cuti, sakit).
      available: row.tersedia,
      offDays: row.hari_libur,
    })),
    haircuts,
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
      // Booking baru wajib memakai kode OTP dari WhatsApp (web menampilkan langkah verifikasi).
      otpRequired,
    },
  }
}

function catalogRouter({ db, otpRequired }) {
  const router = express.Router()
  router.get('/catalog', async (req, res) => {
    // Boleh di-cache sebentar oleh Next/CDN; perubahan dari admin terlihat dalam semenit.
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    res.json(await loadCatalog(db, { otpRequired }))
  })
  // Foto capster dari data URL di database. Tidak ada foto = 404, web menampilkan avatar inisial.
  router.get('/barbers/:key/photo', async (req, res) => {
    const { rows } = await db.query(
      `SELECT * FROM (SELECT ${capsterKey('c')} AS slug, c.foto FROM capster c WHERE c.status_aktif) capster WHERE slug = $1`,
      [req.params.key],
    )
    const foto = rows[0]?.foto
    if (!foto) return res.status(404).json({ error: { code: 'not_found', message: 'Foto tidak ada.' } })
    const match = DATA_URL.exec(foto)
    if (!match) {
      // Path atau tautan: arahkan ke sana. Selain itu tidak dikenali.
      if (/^(https?:)?\/\//.test(foto) || foto.startsWith('/')) return res.redirect(302, foto)
      return res.status(404).json({ error: { code: 'not_found', message: 'Foto tidak ada.' } })
    }
    res.set('Cache-Control', 'public, max-age=300')
    res.type(match[1]).send(Buffer.from(match[2].replace(/\s+/g, ''), 'base64'))
  })
  return router
}

module.exports = { catalogRouter, loadCatalog, loadHaircuts }
