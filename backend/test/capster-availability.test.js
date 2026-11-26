const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { startTestServer, booking, nextPhone } = require('./helpers')

/**
 * capster.tersedia = false: kapster tetap tampil di katalog (web menampilkannya abu-abu, "Tidak tersedia"),
 * tetapi tidak bisa dipesan dan tidak ikut "Siapa saja". capster.status_aktif = false: diarsipkan, hilang dari katalog.
 */
let api
before(async () => {
  api = await startTestServer()
})
after(async () => {
  await api.close()
})

const catalogBarber = async (id) => (await api.get('/api/catalog')).body.barbers.find((barber) => barber.id === id)
const slotBarbers = async (date = '2026-11-26') => (await api.get(`/api/availability?date=${date}&serviceId=haircut-dewasa`)).body.slots.flatMap((slot) => slot.barbers)

describe('saklar tersedia dari admin', () => {
  test('bawaan semua kapster tersedia', async () => {
    const { barbers } = (await api.get('/api/catalog')).body
    assert.ok(barbers.length > 0)
    for (const barber of barbers) assert.equal(barber.available, true, barber.id)
  })

  test('dimatikan: tetap ada di katalog, tidak muncul di jam tersedia, dan tidak bisa dipesan', async () => {
    await api.db.query(`UPDATE capster SET tersedia = false WHERE slug = 'rizky'`)

    assert.equal((await catalogBarber('rizky')).available, false, 'kartunya tetap tampil')
    const offered = await slotBarbers()
    assert.ok(!offered.includes('rizky'))
    assert.ok(offered.length > 0, 'kapster lain tetap tersedia')

    const direct = await api.post('/api/reservations', booking({ barberId: 'rizky', date: '2026-11-26', time: '14:00' }))
    assert.equal(direct.status, 409)
    assert.equal(direct.body.error.code, 'barber_unavailable')

    const any = await api.post('/api/reservations', booking({ barberId: 'any', date: '2026-11-26', time: '14:00' }))
    assert.equal(any.status, 201)
    assert.notEqual(any.body.reservation.barberId, 'rizky', '"Siapa saja" tidak memilih kapster yang dimatikan')
  })

  test('ubah jadwal ke kapster yang dimatikan ditolak, dinyalakan lagi bisa dipesan', async () => {
    const phone = nextPhone()
    const created = await api.post('/api/reservations', booking({ barberId: 'fajar', date: '2026-11-27', time: '11:00', customerPhone: phone }))
    assert.equal(created.status, 201)
    const rejected = await api.post(`/api/reservations/${created.body.reservation.code}/reschedule`, { phone, barberId: 'rizky', date: '2026-11-27', time: '12:00' })
    assert.equal(rejected.status, 409)
    assert.equal(rejected.body.error.code, 'barber_unavailable')

    await api.db.query(`UPDATE capster SET tersedia = true WHERE slug = 'rizky'`)
    assert.equal((await catalogBarber('rizky')).available, true)
    assert.ok((await slotBarbers('2026-11-27')).includes('rizky'))
    assert.equal((await api.post('/api/reservations', booking({ barberId: 'rizky', date: '2026-11-27', time: '15:00' }))).status, 201)
  })

  test('diarsipkan (status_aktif false) hilang dari katalog, berbeda dengan tidak tersedia', async () => {
    await api.db.query(`UPDATE capster SET status_aktif = false WHERE slug = 'bima'`)
    assert.equal(await catalogBarber('bima'), undefined)
    assert.ok(await catalogBarber('rizky'))
  })
})
