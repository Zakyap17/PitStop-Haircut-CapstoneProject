const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { startTestServer, booking } = require('./helpers')

let api
before(async () => {
  api = await startTestServer()
})
after(async () => {
  await api.close()
})

const slotOf = (availability, time) => availability.slots.find((slot) => slot.time === time)

describe('katalog', () => {
  test('mengirim layanan, kapster, gaya rambut, dan aturan reservasi', async () => {
    const { status, body } = await api.get('/api/catalog')
    assert.equal(status, 200)
    assert.equal(body.services.length, 6)
    assert.equal(body.barbers.length, 4)
    assert.equal(body.haircuts.length, 14)
    assert.deepEqual(body.testimonials, [], 'testimoni belum ada sampai diisi data asli')
    assert.equal(body.booking.timeSlots.length, 10)
    assert.equal(body.booking.daysAhead, 7)
    assert.equal(body.booking.opensAt, '10:00')
    assert.deepEqual(body.services[0], { id: 'haircut-dewasa', name: 'Haircut Dewasa', description: 'Konsultasi, potong, cuci, dan styling pomade.', price: 50000, durationMinutes: 45 })
    assert.deepEqual(body.barbers[0].offDays, [1])
  })

  test('health memeriksa koneksi database', async () => {
    const { status, body } = await api.get('/api/health')
    assert.equal(status, 200)
    assert.equal(body.status, 'ok')
  })
})

describe('ketersediaan', () => {
  test('hari Rabu: Andi libur, jam istirahat dan jam tutup dihormati sesuai durasi layanan', async () => {
    const { status, body } = await api.get('/api/availability?date=2026-11-25&serviceId=premium-fade')
    assert.equal(status, 200)
    assert.deepEqual(slotOf(body, '14:00').barbers, ['rizky', 'bima', 'fajar'], 'Andi libur hari Rabu')
    assert.ok(slotOf(body, '17:00').barbers.length > 0, '17:00 + 60 menit selesai tepat 18:00, sebelum istirahat')
    assert.ok(slotOf(body, '20:00').barbers.length > 0, '20:00 + 60 menit selesai tepat 21:00')

    const coloring = (await api.get('/api/availability?date=2026-11-25&serviceId=hair-coloring')).body
    assert.deepEqual(slotOf(coloring, '17:00').barbers, [], '17:00 + 90 menit menabrak istirahat')
    assert.deepEqual(slotOf(coloring, '20:00').barbers, [], '20:00 + 90 menit melewati jam tutup')
    assert.ok(slotOf(coloring, '15:00').barbers.length > 0)
  })

  test('slot yang jamnya sudah lewat hari ini tidak tersedia', async () => {
    api.at('2026-11-25T05:30:00Z') // 12:30 WIB
    try {
      const { body } = await api.get('/api/availability?date=2026-11-25&serviceId=haircut-dewasa')
      for (const time of ['10:00', '11:00', '12:00']) assert.deepEqual(slotOf(body, time).barbers, [], `${time} sudah lewat`)
      assert.ok(slotOf(body, '13:00').barbers.length > 0)
    } finally {
      api.at('2026-11-25T02:00:00Z')
    }
  })

  test('tanggal di luar jangkauan, salah format, atau layanan tidak ada ditolak', async () => {
    assert.equal((await api.get('/api/availability?date=2026-11-24&serviceId=haircut-dewasa')).body.error.code, 'date_out_of_range')
    assert.equal((await api.get('/api/availability?date=2026-12-02&serviceId=haircut-dewasa')).body.error.code, 'date_out_of_range')
    assert.equal((await api.get('/api/availability?date=2026-12-01&serviceId=haircut-dewasa')).status, 200, 'hari ke-7 masih boleh')
    assert.equal((await api.get('/api/availability?date=2026-02-30&serviceId=haircut-dewasa')).body.error.code, 'invalid_date')
    assert.equal((await api.get('/api/availability?date=besok&serviceId=haircut-dewasa')).body.error.code, 'invalid_input')
    assert.equal((await api.get('/api/availability?date=2026-11-25&serviceId=tidak-ada')).status, 404)
  })
})

describe('membuat reservasi', () => {
  test('berhasil dan menahan slot, termasuk lintas durasi', async () => {
    const created = await api.post('/api/reservations', booking({ serviceId: 'hair-coloring', time: '10:00', customerEmail: 'a@example.com' }))
    assert.equal(created.status, 201)
    const r = created.body.reservation
    assert.match(r.code, /^PS-\d{4}$/)
    assert.deepEqual([r.serviceName, r.durationMinutes, r.price, r.barberName, r.date, r.time, r.status], ['Hair Coloring', 90, 120000, 'Rizky', '2026-11-25', '10:00', 'confirmed'])

    const overlap = await api.post('/api/reservations', booking({ time: '11:00', customerEmail: 'b@example.com' }))
    assert.equal(overlap.status, 409, '10:00 + 90 menit = 11:30, jadi 11:00 Rizky bentrok')
    assert.equal(overlap.body.error.code, 'slot_taken')

    const otherBarber = await api.post('/api/reservations', booking({ time: '11:00', barberId: 'bima', customerEmail: 'b@example.com' }))
    assert.equal(otherBarber.status, 201, 'kapster lain di jam yang sama tidak bentrok')

    const availability = (await api.get('/api/availability?date=2026-11-25&serviceId=haircut-dewasa')).body
    assert.ok(!slotOf(availability, '10:00').barbers.includes('rizky'))
    assert.ok(!slotOf(availability, '11:00').barbers.includes('rizky'))
    assert.ok(slotOf(availability, '12:00').barbers.includes('rizky'), 'setelah selesai 11:30, jam 12:00 kosong lagi')
  })

  test('lima permintaan serentak untuk slot yang sama: hanya satu berhasil', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) => api.post('/api/reservations', booking({ date: '2026-11-26', time: '15:00', barberId: 'andi', customerEmail: `race${index}@example.com` }))),
    )
    const statuses = results.map((result) => result.status).sort()
    assert.deepEqual(statuses, [201, 409, 409, 409, 409])
    const rows = await api.db.query(`SELECT count(*)::int AS n FROM reservations WHERE barber_id = 'andi' AND to_char(starts_at, 'YYYY-MM-DD HH24:MI') = '2026-11-26 15:00'`)
    assert.equal(rows.rows[0].n, 1)
  })

  test('menolak data tidak valid dan jadwal yang tidak mungkin', async () => {
    const reject = async (overrides, status, code) => {
      const result = await api.post('/api/reservations', booking({ customerEmail: 'val@example.com', ...overrides }))
      assert.equal(result.status, status, JSON.stringify(overrides))
      assert.equal(result.body.error.code, code, JSON.stringify(overrides))
    }
    await reject({ customerEmail: 'bukan-email' }, 400, 'invalid_input')
    await reject({ customerName: 'A' }, 400, 'invalid_input')
    await reject({ time: '25:00' }, 400, 'invalid_input')
    await reject({ time: '14:30' }, 400, 'invalid_time')
    await reject({ serviceId: 'tidak-ada' }, 404, 'not_found')
    await reject({ barberId: 'tidak-ada' }, 404, 'not_found')
    await reject({ date: '2026-11-24', time: '14:00' }, 400, 'date_out_of_range')
    await reject({ date: '2026-12-05' }, 400, 'date_out_of_range')
    await reject({ barberId: 'andi', date: '2026-11-25', time: '16:00' }, 409, 'slot_taken') // Andi libur Rabu
    await reject({ time: '18:00' }, 400, 'invalid_time') // bukan slot yang disediakan
    await reject({ serviceId: 'hair-coloring', time: '20:00', date: '2026-11-27' }, 409, 'slot_unavailable') // lewat jam tutup
  })

  test('slot yang jamnya sudah lewat ditolak', async () => {
    api.at('2026-11-25T08:00:00Z') // 15:00 WIB
    try {
      const result = await api.post('/api/reservations', booking({ time: '14:00', barberId: 'fajar', customerEmail: 'late@example.com' }))
      assert.equal(result.status, 409)
      assert.equal(result.body.error.code, 'slot_unavailable')
    } finally {
      api.at('2026-11-25T02:00:00Z')
    }
  })

  test('satu email dibatasi tiga reservasi aktif', async () => {
    const email = 'borong@example.com'
    for (const time of ['10:00', '11:00', '12:00']) {
      const ok = await api.post('/api/reservations', booking({ date: '2026-11-27', time, barberId: 'rizky', customerEmail: email }))
      assert.equal(ok.status, 201, time)
    }
    const fourth = await api.post('/api/reservations', booking({ date: '2026-11-27', time: '13:00', barberId: 'rizky', customerEmail: email }))
    assert.equal(fourth.status, 409)
    assert.equal(fourth.body.error.code, 'too_many_active')
    const upper = await api.post('/api/reservations', booking({ date: '2026-11-27', time: '13:00', barberId: 'rizky', customerEmail: 'BORONG@Example.com' }))
    assert.equal(upper.body.error.code, 'too_many_active', 'huruf besar/kecil email tidak dibedakan')
  })
})

describe('cek, ubah, dan batalkan', () => {
  let code
  const email = 'siti@example.com'
  before(async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-28', time: '13:00', barberId: 'fajar', customerEmail: email, hairstyle: 'Low Taper Fade' }))
    code = created.body.reservation.code
  })

  test('cek dengan kode yang diketik berantakan dan email beda huruf besar', async () => {
    const result = await api.post('/api/reservations/lookup', { code: `  ps ${code.slice(3)} `, email: 'SITI@Example.com' })
    assert.equal(result.status, 200)
    assert.equal(result.body.reservation.code, code)
    assert.equal(result.body.reservation.hairstyle, 'Low Taper Fade')
    assert.equal(result.body.reservation.customerName, 'Budi Santoso')
  })

  test('kode atau email salah sama-sama dijawab tidak ditemukan', async () => {
    assert.equal((await api.post('/api/reservations/lookup', { code, email: 'orang@lain.com' })).status, 404)
    assert.equal((await api.post('/api/reservations/lookup', { code: 'PS-0000', email })).status, 404)
    assert.equal((await api.post('/api/reservations/lookup', { code })).status, 400)
  })

  test('ubah jadwal: berhasil, hitungan naik, dan dibatasi dua kali', async () => {
    const reschedule = (body) => api.post(`/api/reservations/${code}/reschedule`, { email, ...body })

    assert.equal((await reschedule({ barberId: 'fajar', date: '2026-11-28', time: '13:00' })).body.error.code, 'same_schedule')
    assert.equal((await api.post(`/api/reservations/${code}/reschedule`, { email: 'orang@lain.com', barberId: 'fajar', date: '2026-11-28', time: '14:00' })).status, 404)

    const first = await reschedule({ barberId: 'fajar', date: '2026-11-28', time: '14:00' })
    assert.equal(first.status, 200)
    assert.deepEqual([first.body.reservation.time, first.body.reservation.rescheduleCount], ['14:00', 1])

    const old = (await api.get('/api/availability?date=2026-11-28&serviceId=haircut-dewasa')).body
    assert.ok(slotOf(old, '13:00').barbers.includes('fajar'), 'slot lama dilepas')
    assert.ok(!slotOf(old, '14:00').barbers.includes('fajar'), 'slot baru ditahan')

    const taken = await reschedule({ barberId: 'rizky', date: '2026-11-27', time: '10:00' })
    assert.equal(taken.body.error.code, 'slot_taken', 'jam 10:00 Rizky tanggal 27 sudah diborong email lain')

    const second = await reschedule({ barberId: 'bima', date: '2026-11-29', time: '16:00' })
    assert.equal(second.status, 200)
    assert.equal(second.body.reservation.barberName, 'Bima')

    const third = await reschedule({ barberId: 'bima', date: '2026-11-29', time: '19:00' })
    assert.equal(third.status, 409)
    assert.equal(third.body.error.code, 'reschedule_limit')
  })

  test('batalkan: melepas slot, aman diulang, dan tidak bisa diubah lagi', async () => {
    const before = (await api.get('/api/availability?date=2026-11-29&serviceId=haircut-dewasa')).body
    assert.ok(!slotOf(before, '16:00').barbers.includes('bima'))

    const cancelled = await api.post(`/api/reservations/${code}/cancel`, { email })
    assert.equal(cancelled.status, 200)
    assert.equal(cancelled.body.reservation.status, 'cancelled')

    const after = (await api.get('/api/availability?date=2026-11-29&serviceId=haircut-dewasa')).body
    assert.ok(slotOf(after, '16:00').barbers.includes('bima'), 'slot terbuka lagi')

    assert.equal((await api.post(`/api/reservations/${code}/cancel`, { email })).status, 200, 'membatalkan dua kali tidak error')
    const reschedule = await api.post(`/api/reservations/${code}/reschedule`, { email, barberId: 'bima', date: '2026-11-29', time: '17:00' })
    assert.equal(reschedule.body.error.code, 'not_active')
    assert.equal((await api.post('/api/reservations/lookup', { code, email })).body.reservation.status, 'cancelled', 'tetap bisa dicek')
    assert.equal((await api.post(`/api/reservations/${code}/cancel`, { email: 'orang@lain.com' })).status, 404)
  })

  test('reservasi yang jadwalnya sudah lewat tidak bisa dibatalkan atau diubah', async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-25', time: '10:00', barberId: 'bima', customerEmail: 'lewat@example.com' }))
    assert.equal(created.status, 201)
    const lateCode = created.body.reservation.code
    api.at('2026-11-25T04:00:00Z') // 11:00 WIB, sudah lewat dari 10:00
    try {
      assert.equal((await api.post(`/api/reservations/${lateCode}/cancel`, { email: 'lewat@example.com' })).body.error.code, 'already_started')
      assert.equal((await api.post(`/api/reservations/${lateCode}/reschedule`, { email: 'lewat@example.com', barberId: 'bima', date: '2026-11-26', time: '10:00' })).body.error.code, 'already_started')
    } finally {
      api.at('2026-11-25T02:00:00Z')
    }
  })
})

describe('ketahanan', () => {
  test('JSON rusak dan alamat tidak ada dijawab rapi', async () => {
    const response = await fetch(`${api.base}/api/reservations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{rusak' })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error.code, 'invalid_json')
    assert.equal((await api.get('/api/tidak-ada')).status, 404)
  })

  test('batas percobaan: permintaan berlebih dijawab 429', async () => {
    const limited = await startTestServer({ limits: { write: 3, access: 3 } })
    try {
      const statuses = []
      for (let index = 0; index < 5; index++) statuses.push((await limited.post('/api/reservations/lookup', { code: 'PS-1234', email: 'x@example.com' })).status)
      assert.deepEqual(statuses, [404, 404, 404, 429, 429])
    } finally {
      await limited.close()
    }
  })
})
