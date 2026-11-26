const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createMemoryProvider } = require('../src/notifications/providers')
const { startTestServer, booking, nextPhone } = require('./helpers')

/**
 * Database bersama di Supabase diubah oleh migrasi sisi internal: layanan.slug, galeri.slug, capster.jabatan,
 * capster.pengalaman_tahun dan capster.hari_libur hilang, capster.slug boleh kosong, dan ada capster baru atau yang diarsipkan.
 * Tes ini meniru keadaan itu di database tertanam lalu menjalankan alur customer dari awal sampai akhir.
 */
async function applyInternalSchema(db) {
  await db.exec(`
    ALTER TABLE layanan DROP COLUMN slug;
    ALTER TABLE galeri DROP COLUMN slug;
    ALTER TABLE capster DROP COLUMN jabatan, DROP COLUMN pengalaman_tahun, DROP COLUMN hari_libur;
    -- Capster baru tanpa slug, dan satu capster diarsipkan (status_aktif false), seperti di data bersama.
    INSERT INTO pengguna (nama_lengkap, email, password_hash, role, status_aktif) VALUES ('Nauri Baru', 'nauri@pitstop.invalid', '!', 'capster', true);
    INSERT INTO capster (id_pengguna, nama_capster, spesialisasi, status_aktif, slug)
      SELECT id_pengguna, 'Nauri Baru', NULL, true, NULL FROM pengguna WHERE email = 'nauri@pitstop.invalid';
    UPDATE capster SET status_aktif = false WHERE slug = 'andi';
  `)
}

let api
let provider
before(async () => {
  api = await startTestServer({ afterMigrate: applyInternalSchema, webUrl: 'https://pitstop.example.com' })
  provider = createMemoryProvider()
})
after(async () => {
  await api.close()
})

describe('API customer di skema bersama (tanpa slug dan kolom jabatan/hari libur)', () => {
  test('katalog: kunci layanan dan gaya diturunkan dari nama dan nama file, capster tanpa slug tetap muncul', async () => {
    const { status, body } = await api.get('/api/catalog')
    assert.equal(status, 200)
    assert.deepEqual(
      body.services.map((item) => item.id),
      ['haircut-dewasa', 'haircut-anak', 'premium-fade', 'shaving-beard', 'hair-coloring', 'hair-spa-wash'],
    )
    // Sama dengan kunci yang dipakai web (foto /images/cuts/<kunci>.png).
    assert.ok(body.haircuts.some((item) => item.id === 'buzz-and-beard'))
    assert.ok(body.haircuts.some((item) => item.id === 'skin-fade'))
    for (const haircut of body.haircuts) assert.match(haircut.image, new RegExp(`/${haircut.id}\\.png$`))
    // Capster yang diarsipkan tidak muncul sebagai pilihan, capster baru muncul dengan kunci turunan dari nama dan id.
    assert.ok(!body.barbers.some((item) => item.id === 'andi'))
    const baru = body.barbers.find((item) => item.name === 'Nauri Baru')
    assert.match(baru.id, /^nauri-baru-\d+$/)
    // Kolom yang hilang memakai nilai bawaan, bukan error.
    for (const barber of body.barbers) {
      assert.equal(barber.role, 'Capster')
      assert.equal(barber.experienceYears, null)
      assert.deepEqual(barber.offDays, [])
    }
    // Gaya dari capster yang diarsipkan tetap tampil sebagai referensi.
    assert.ok(body.haircuts.some((item) => item.barberId === 'andi'))
  })

  test('jam tersedia untuk layanan dan tanggal tertentu', async () => {
    const { status, body } = await api.get('/api/availability?date=2026-11-26&serviceId=haircut-dewasa')
    assert.equal(status, 200)
    assert.equal(body.serviceId, 'haircut-dewasa')
    assert.ok(body.slots.length > 0)
    assert.ok(body.slots[0].barbers.length > 0)
    assert.ok(!body.slots.some((slot) => slot.barbers.includes('andi')))
    assert.equal((await api.get('/api/availability?date=2026-11-26&serviceId=tidak-ada')).status, 404)
  })

  test('booking dibuat, dicek, diubah jadwalnya, dan dibatalkan', async () => {
    const phone = nextPhone()
    const created = await api.post('/api/reservations', booking({ customerPhone: phone, date: '2026-11-26', time: '14:00' }))
    assert.equal(created.status, 201)
    const reservation = created.body.reservation
    assert.equal(reservation.serviceId, 'haircut-dewasa')
    assert.equal(reservation.barberId, 'rizky')
    assert.equal(reservation.status, 'menunggu_pembayaran')
    assert.equal(reservation.dp.nominal, 25000)

    const looked = await api.post('/api/reservations/lookup', { code: reservation.code, phone })
    assert.equal(looked.status, 200)
    assert.equal(looked.body.reservation.serviceName, 'Haircut Dewasa')

    // Capster tanpa slug (kunci turunan) juga bisa dipesan.
    const catalog = (await api.get('/api/catalog')).body
    const baru = catalog.barbers.find((item) => item.name === 'Nauri Baru')
    const withNew = await api.post('/api/reservations', booking({ customerPhone: nextPhone(), date: '2026-11-26', time: '16:00', barberId: baru.id }))
    assert.equal(withNew.status, 201)
    assert.equal(withNew.body.reservation.barberId, baru.id)

    const moved = await api.post(`/api/reservations/${reservation.code}/reschedule`, { phone, barberId: 'rizky', date: '2026-11-26', time: '15:00' })
    assert.equal(moved.status, 200)
    assert.equal(moved.body.reservation.time, '15:00')

    const cancelled = await api.post(`/api/reservations/${reservation.code}/cancel`, { phone })
    assert.equal(cancelled.status, 200)
    assert.equal(cancelled.body.reservation.status, 'dibatalkan')
  })

  test('pesan WhatsApp tetap dibuat dan terkirim', async () => {
    const phone = nextPhone()
    const created = await api.post('/api/reservations', booking({ customerPhone: phone, date: '2026-11-26', time: '12:00' }))
    assert.equal(created.status, 201)
    const result = await api.tick(provider)
    assert.ok(result.sent >= 1)
    assert.ok(provider.sent.some((item) => item.message.includes(created.body.reservation.code)))
  })
})
