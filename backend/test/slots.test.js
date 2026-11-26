const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { startTestServer, booking, nextPhone } = require('./helpers')

/**
 * Slot per jam (10:00 sampai 17:00 dan 19:00, 20:00; istirahat 18:00-19:00). Waktu yang ditahan untuk satu layanan adalah
 * durasinya dibulatkan ke atas ke kelipatan satu slot: potong 45 menit menahan 1 slot, hair coloring 90 menit menahan 2 slot.
 * 2026-11-26 (Kamis) dipakai karena tidak ada capster yang libur.
 */
let api
before(async () => {
  api = await startTestServer()
})
after(async () => {
  await api.close()
})

const availability = async (serviceId, date = '2026-11-26') => (await api.get(`/api/availability?date=${date}&serviceId=${serviceId}`)).body
const slotOf = (body, time) => body.slots.find((slot) => slot.time === time)

describe('slot yang ditahan mengikuti durasi layanan', () => {
  test('jawaban jam tersedia memuat jumlah slot dan waktu yang ditahan', async () => {
    const coloring = await availability('hair-coloring')
    assert.deepEqual([coloring.durationMinutes, coloring.reservedMinutes, coloring.slotsNeeded], [90, 120, 2])
    const haircut = await availability('haircut-dewasa')
    assert.deepEqual([haircut.durationMinutes, haircut.reservedMinutes, haircut.slotsNeeded], [45, 60, 1])
    const spa = await availability('hair-spa-wash')
    assert.deepEqual([spa.durationMinutes, spa.reservedMinutes, spa.slotsNeeded], [20, 60, 1])
  })

  test('layanan 2 slot hanya muncul di jam yang cukup untuk dua slot berurutan', async () => {
    const coloring = await availability('hair-coloring')
    assert.ok(slotOf(coloring, '16:00').barbers.length > 0, '16:00 sampai 18:00 pas sebelum istirahat')
    assert.deepEqual(slotOf(coloring, '17:00').barbers, [], '17:00 sampai 19:00 menabrak istirahat')
    assert.ok(slotOf(coloring, '19:00').barbers.length > 0, '19:00 sampai 21:00 pas sampai tutup')
    assert.deepEqual(slotOf(coloring, '20:00').barbers, [], '20:00 sampai 22:00 melewati jam tutup')
  })

  test('hair coloring pukul 10:00 menahan Rizky sampai 12:00, jadi 11:00 penuh dan 12:00 kosong', async () => {
    const created = await api.post('/api/reservations', booking({ serviceId: 'hair-coloring', time: '10:00', date: '2026-11-26', barberId: 'rizky' }))
    assert.equal(created.status, 201)
    assert.deepEqual([created.body.reservation.durationMinutes, created.body.reservation.reservedMinutes], [90, 120])
    const stored = await api.db.query(`SELECT to_char(jam_selesai, 'HH24:MI') AS selesai FROM booking WHERE kode_booking = $1`, [created.body.reservation.code])
    assert.equal(stored.rows[0].selesai, '12:00')

    const haircut = await availability('haircut-dewasa')
    assert.ok(!slotOf(haircut, '10:00').barbers.includes('rizky'))
    assert.ok(!slotOf(haircut, '11:00').barbers.includes('rizky'), 'slot kedua masih ditahan')
    assert.ok(slotOf(haircut, '12:00').barbers.includes('rizky'))

    const overlap = await api.post('/api/reservations', booking({ time: '11:00', date: '2026-11-26', barberId: 'rizky' }))
    assert.equal(overlap.status, 409)
    assert.equal(overlap.body.error.code, 'slot_taken')
    assert.equal((await api.post('/api/reservations', booking({ time: '12:00', date: '2026-11-26', barberId: 'rizky' }))).status, 201)
  })

  test('potong 45 menit hanya menahan satu slot', async () => {
    const created = await api.post('/api/reservations', booking({ time: '14:00', date: '2026-11-26', barberId: 'andi' }))
    assert.equal(created.status, 201)
    assert.equal(created.body.reservation.reservedMinutes, 60)
    assert.equal((await api.post('/api/reservations', booking({ time: '15:00', date: '2026-11-26', barberId: 'andi' }))).status, 201)
  })

  test('ubah jadwal memakai aturan yang sama: hair coloring tidak bisa dipindah ke jam yang tidak muat dua slot', async () => {
    const phone = nextPhone()
    const created = await api.post('/api/reservations', booking({ serviceId: 'hair-coloring', time: '13:00', date: '2026-11-27', barberId: 'fajar', customerPhone: phone }))
    assert.equal(created.status, 201)
    const code = created.body.reservation.code
    const bad = await api.post(`/api/reservations/${code}/reschedule`, { phone, barberId: 'fajar', date: '2026-11-27', time: '17:00' })
    assert.equal(bad.status, 409)
    const ok = await api.post(`/api/reservations/${code}/reschedule`, { phone, barberId: 'fajar', date: '2026-11-27', time: '16:00' })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.reservation.reservedMinutes, 120)
    const stored = await api.db.query(`SELECT to_char(jam_selesai, 'HH24:MI') AS selesai FROM booking WHERE kode_booking = $1`, [code])
    assert.equal(stored.rows[0].selesai, '18:00')
  })
})
