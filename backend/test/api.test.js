const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { startTestServer, booking, nextPhone } = require('./helpers')

let api
before(async () => {
  api = await startTestServer()
})
after(async () => {
  await api.close()
})

const slotOf = (availability, time) => availability.slots.find((slot) => slot.time === time)
const availability = async (date, serviceId = 'haircut-dewasa') => (await api.get(`/api/availability?date=${date}&serviceId=${serviceId}`)).body

describe('katalog (dari tabel resmi)', () => {
  test('layanan, capster, galeri, dan aturan booking', async () => {
    const { status, body } = await api.get('/api/catalog')
    assert.equal(status, 200)
    assert.equal(body.services.length, 6)
    assert.equal(body.barbers.length, 4)
    assert.equal(body.haircuts.length, 14)
    assert.deepEqual(body.testimonials, [])
    assert.equal(body.booking.timeSlots.length, 10)
    assert.deepEqual(body.services[0], { id: 'haircut-dewasa', name: 'Haircut Dewasa', description: 'Konsultasi, potong, cuci, dan styling pomade.', price: 50000, durationMinutes: 45 })
    assert.deepEqual(body.barbers[0], { id: 'rizky', name: 'Rizky', role: 'Head Kapster', specialty: 'Fade & Crop', experienceYears: 8, offDays: [1], photo: null })
    assert.deepEqual(Object.keys(body.haircuts[0]).sort(), ['barber', 'barberId', 'category', 'id', 'image', 'name'], 'tanpa rating')
    assert.equal(body.haircuts[0].barberId, 'rizky')
  })

  test('health memeriksa koneksi database', async () => {
    assert.equal((await api.get('/api/health')).body.status, 'ok')
  })
})

describe('ketersediaan', () => {
  test('hari Rabu: Andi libur, istirahat dan jam tutup dihormati sesuai durasi layanan', async () => {
    const body = await availability('2026-11-25', 'premium-fade')
    assert.deepEqual(slotOf(body, '14:00').barbers, ['rizky', 'bima', 'fajar'])
    assert.ok(slotOf(body, '17:00').barbers.length > 0, '17:00 + 60 menit selesai tepat 18:00')
    assert.ok(slotOf(body, '20:00').barbers.length > 0, '20:00 + 60 menit selesai tepat 21:00')
    const coloring = await availability('2026-11-25', 'hair-coloring')
    assert.deepEqual(slotOf(coloring, '17:00').barbers, [], 'menabrak istirahat')
    assert.deepEqual(slotOf(coloring, '20:00').barbers, [], 'melewati jam tutup')
  })

  test('jam yang sudah lewat hari ini tidak tersedia', async () => {
    api.at('2026-11-25T05:30:00Z') // 12:30 WIB
    try {
      const body = await availability('2026-11-25')
      for (const time of ['10:00', '11:00', '12:00']) assert.deepEqual(slotOf(body, time).barbers, [], time)
      assert.ok(slotOf(body, '13:00').barbers.length > 0)
    } finally {
      api.at('2026-11-25T02:00:00Z')
    }
  })

  test('tanggal di luar jangkauan, salah format, atau layanan tidak ada ditolak', async () => {
    assert.equal((await api.get('/api/availability?date=2026-11-24&serviceId=haircut-dewasa')).body.error.code, 'date_out_of_range')
    assert.equal((await api.get('/api/availability?date=2026-12-02&serviceId=haircut-dewasa')).body.error.code, 'date_out_of_range')
    assert.equal((await api.get('/api/availability?date=2026-12-01&serviceId=haircut-dewasa')).status, 200)
    assert.equal((await api.get('/api/availability?date=2026-02-30&serviceId=haircut-dewasa')).body.error.code, 'invalid_date')
    assert.equal((await api.get('/api/availability?date=besok&serviceId=haircut-dewasa')).body.error.code, 'invalid_input')
    assert.equal((await api.get('/api/availability?date=2026-11-25&serviceId=tidak-ada')).status, 404)
  })

  test('jadwal_capster menentukan jam kerja: jam tersedia berlaku, libur menutup, tanpa baris ikut jam toko', async () => {
    const id = async (slug) => (await api.db.query('SELECT id_capster::int AS id FROM capster WHERE slug = $1', [slug])).rows[0].id
    const bima = await id('bima')
    const fajar = await id('fajar')
    // Bima bekerja hanya 12:00-16:00 pada 28 Nov (Sabtu). Fajar ditandai libur seharian.
    await api.db.query(`INSERT INTO jadwal_capster (id_capster, tanggal, jam_mulai, jam_selesai, status_slot) VALUES ($1, '2026-11-28', '12:00', '16:00', 'tersedia')`, [bima])
    await api.db.query(`INSERT INTO jadwal_capster (id_capster, tanggal, jam_mulai, jam_selesai, status_slot) VALUES ($1, '2026-11-28', '10:00', '21:00', 'libur')`, [fajar])
    const body = await availability('2026-11-28')
    assert.ok(!slotOf(body, '10:00').barbers.includes('bima'), 'sebelum jam kerja Bima')
    assert.ok(slotOf(body, '13:00').barbers.includes('bima'))
    assert.ok(!slotOf(body, '16:00').barbers.includes('bima'), '16:00 + 45 menit melewati jam kerja')
    assert.ok(!slotOf(body, '13:00').barbers.includes('fajar'), 'Fajar libur')
    assert.ok(slotOf(body, '13:00').barbers.includes('rizky'), 'Rizky tanpa baris: ikut jam toko')
  })
})

describe('membuat booking (DP manual)', () => {
  test('berhasil: menunggu DP, menahan slot, mencatat layanan dan pembayaran DP', async () => {
    const created = await api.post('/api/reservations', booking({ serviceId: 'hair-coloring', time: '10:00', customerPhone: '0812-3456-0001' }))
    assert.equal(created.status, 201)
    const r = created.body.reservation
    assert.match(r.code, /^PS-\d{4}$/)
    assert.deepEqual([r.serviceId, r.serviceName, r.durationMinutes, r.price, r.barberName, r.date, r.time, r.status], ['hair-coloring', 'Hair Coloring', 90, 120000, 'Rizky', '2026-11-25', '10:00', 'menunggu_pembayaran'])
    assert.deepEqual([r.durationMinutes, r.reservedMinutes], [90, 120], 'layanan 90 menit menahan 2 slot (120 menit)')
    assert.equal(r.customerPhone, '6281234560001')
    assert.deepEqual([r.dp.nominal, r.dp.status], [25000, 'menunggu'])
    assert.equal(r.dp.payBefore, '2026-11-25T04:00:00.000Z', 'batas bayar = 2 jam dari jam server (09:00 + 2 jam WIB)')
    assert.ok(!('customerEmail' in r), 'tanpa email')

    const rows = await api.db.query(
      `SELECT b.tipe_booking, b.status_booking, round(b.total_harga)::int AS total, round(b.nominal_dp)::int AS dp, to_char(b.jam_selesai,'HH24:MI') AS selesai,
              (SELECT count(*)::int FROM booking_layanan bl WHERE bl.id_booking = b.id_booking) AS layanan,
              (SELECT p.jenis_pembayaran || '/' || p.status_pembayaran || '/' || round(p.nominal)::int FROM pembayaran p WHERE p.id_booking = b.id_booking) AS bayar
         FROM booking b WHERE b.kode_booking = $1`, [r.code])
    assert.deepEqual(rows.rows[0], { tipe_booking: 'online', status_booking: 'menunggu_pembayaran', total: 120000, dp: 25000, selesai: '12:00', layanan: 1, bayar: 'dp/menunggu/25000' })
    assert.equal((await api.db.query('SELECT count(*)::int AS n FROM invoice')).rows[0].n, 0, 'invoice baru terbit setelah pelunasan')

    const overlap = await api.post('/api/reservations', booking({ time: '11:00' }))
    assert.equal(overlap.body.error.code, 'slot_taken', '10:00 + 90 menit = 11:30, jadi 11:00 Rizky bentrok')
    assert.equal((await api.post('/api/reservations', booking({ time: '11:00', barberId: 'bima' }))).status, 201)

    const open = await availability('2026-11-25')
    assert.ok(!slotOf(open, '10:00').barbers.includes('rizky') && !slotOf(open, '11:00').barbers.includes('rizky'))
    assert.ok(slotOf(open, '12:00').barbers.includes('rizky'))
  })

  test('tanpa preferensi: dipilihkan capster kosong dengan booking paling sedikit', async () => {
    const date = '2026-11-26' // Kamis: Fajar libur, Andi, Rizky, Bima masuk
    const first = await api.post('/api/reservations', booking({ date, time: '10:00', barberId: undefined }))
    assert.equal(first.status, 201)
    const second = await api.post('/api/reservations', booking({ date, time: '12:00', barberId: 'any' }))
    assert.equal(second.status, 201)
    assert.notEqual(second.body.reservation.barberId, first.body.reservation.barberId, 'beban dibagi rata, bukan menumpuk di satu capster')
    assert.ok(!['fajar'].includes(first.body.reservation.barberId), 'capster yang libur tidak dipilih')

    // semua capster yang masuk penuh di jam itu -> ditolak
    const date2 = '2026-11-27' // Jumat: semua masuk
    for (const barberId of ['rizky', 'andi', 'bima', 'fajar']) assert.equal((await api.post('/api/reservations', booking({ date: date2, time: '15:00', barberId }))).status, 201)
    const full = await api.post('/api/reservations', booking({ date: date2, time: '15:00', barberId: 'any' }))
    assert.equal(full.status, 409)
    assert.equal(full.body.error.code, 'slot_taken')
  })

  test('lima permintaan serentak untuk slot yang sama: hanya satu berhasil', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => api.post('/api/reservations', booking({ date: '2026-11-26', time: '15:00', barberId: 'andi' }))))
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409, 409, 409, 409])
  })

  test('menolak data tidak valid dan jadwal yang tidak mungkin', async () => {
    const reject = async (overrides, status, code) => {
      const result = await api.post('/api/reservations', booking(overrides))
      assert.equal(result.status, status, JSON.stringify(overrides))
      assert.equal(result.body.error.code, code, JSON.stringify(overrides))
    }
    await reject({ customerPhone: '12345678' }, 400, 'invalid_phone')
    await reject({ customerPhone: '021-5551234' }, 400, 'invalid_phone')
    await reject({ customerName: 'A' }, 400, 'invalid_input')
    await reject({ time: '25:00' }, 400, 'invalid_input')
    await reject({ time: '14:30' }, 400, 'invalid_time')
    await reject({ time: '18:00' }, 400, 'invalid_time')
    await reject({ serviceId: 'tidak-ada' }, 404, 'not_found')
    await reject({ barberId: 'tidak-ada' }, 404, 'not_found')
    await reject({ date: '2026-11-24' }, 400, 'date_out_of_range')
    await reject({ date: '2026-12-05' }, 400, 'date_out_of_range')
    await reject({ barberId: 'andi', date: '2026-11-25', time: '16:00' }, 409, 'slot_taken') // Andi libur Rabu
    await reject({ serviceId: 'hair-coloring', time: '20:00', date: '2026-11-27' }, 409, 'slot_unavailable')
    const noPhone = await api.post('/api/reservations', { ...booking(), customerPhone: undefined })
    assert.equal(noPhone.status, 400)
  })

  test('satu nomor WhatsApp dibatasi tiga booking aktif', async () => {
    const phone = nextPhone()
    for (const time of ['10:00', '11:00', '12:00']) assert.equal((await api.post('/api/reservations', booking({ date: '2026-11-29', time, barberId: 'rizky', customerPhone: phone }))).status, 201, time)
    const fourth = await api.post('/api/reservations', booking({ date: '2026-11-29', time: '13:00', barberId: 'rizky', customerPhone: phone }))
    assert.equal(fourth.body.error.code, 'too_many_active')
    const sameNumberOtherFormat = await api.post('/api/reservations', booking({ date: '2026-11-29', time: '13:00', barberId: 'rizky', customerPhone: `+62 ${phone.slice(1)}` }))
    assert.equal(sameNumberOtherFormat.body.error.code, 'too_many_active', 'format nomor berbeda tetap orang yang sama')
  })

  test('DP mengikuti pengaturan_dp: persentase dari total, dan 0% langsung terkonfirmasi', async () => {
    const owner = (await api.db.query('SELECT id_pengguna::int AS id FROM pengguna LIMIT 1')).rows[0].id
    await api.db.query(`INSERT INTO pengaturan_dp (id_pengguna, persentase_dp, berlaku_sejak) VALUES ($1, 20, '2026-01-01')`, [owner])
    const twenty = await api.post('/api/reservations', booking({ date: '2026-12-01', time: '10:00', serviceId: 'premium-fade' }))
    assert.equal(twenty.body.reservation.dp.nominal, 13000, '20% dari 65.000')
    await api.db.query(`INSERT INTO pengaturan_dp (id_pengguna, persentase_dp, berlaku_sejak) VALUES ($1, 0, '2026-02-01')`, [owner])
    const zero = await api.post('/api/reservations', booking({ date: '2026-12-01', time: '12:00', barberId: 'andi' }))
    assert.equal(zero.body.reservation.status, 'dikonfirmasi', 'tanpa DP tidak perlu menunggu pembayaran')
    assert.equal((await api.db.query('SELECT count(*)::int AS n FROM pembayaran p JOIN booking b ON b.id_booking = p.id_booking WHERE b.kode_booking = $1', [zero.body.reservation.code])).rows[0].n, 0)
    await api.db.query('DELETE FROM pengaturan_dp')
  })
})

describe('cek, ubah, dan batalkan (identitas = nomor WhatsApp)', () => {
  let code
  const phone = '081200099001'
  before(async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-28', time: '13:00', barberId: 'bima', customerPhone: phone, hairstyle: 'Low Taper Fade' }))
    code = created.body.reservation.code
  })

  test('cek dengan kode berantakan dan nomor dalam format berbeda', async () => {
    const result = await api.post('/api/reservations/lookup', { code: `  ps ${code.slice(3)} `, phone: '+62 812-0009-9001' })
    assert.equal(result.status, 200)
    assert.equal(result.body.reservation.code, code)
    assert.equal(result.body.reservation.hairstyle, 'Low Taper Fade')
    assert.deepEqual(result.body.reservation.whatsapp, { to: '0812••••001', status: 'pending' })
  })

  test('kode atau nomor salah sama-sama dijawab tidak ditemukan', async () => {
    assert.equal((await api.post('/api/reservations/lookup', { code, phone: '081299999999' })).status, 404)
    assert.equal((await api.post('/api/reservations/lookup', { code: 'PS-0000', phone })).status, 404)
    assert.equal((await api.post('/api/reservations/lookup', { code, phone: 'abc12345' })).status, 404)
    assert.equal((await api.post('/api/reservations/lookup', { code })).status, 400)
  })

  test('ubah jadwal: hitungan naik, slot lama dilepas, dibatasi dua kali', async () => {
    const reschedule = (body) => api.post(`/api/reservations/${code}/reschedule`, { phone, ...body })
    assert.equal((await reschedule({ barberId: 'bima', date: '2026-11-28', time: '13:00' })).body.error.code, 'same_schedule')
    assert.equal((await api.post(`/api/reservations/${code}/reschedule`, { phone: '081299999999', barberId: 'bima', date: '2026-11-28', time: '14:00' })).status, 404)

    const first = await reschedule({ barberId: 'bima', date: '2026-11-28', time: '14:00' })
    assert.equal(first.status, 200)
    assert.deepEqual([first.body.reservation.time, first.body.reservation.rescheduleCount], ['14:00', 1])
    const old = await availability('2026-11-28')
    assert.ok(slotOf(old, '13:00').barbers.includes('bima') && !slotOf(old, '14:00').barbers.includes('bima'))

    assert.equal((await reschedule({ barberId: 'rizky', date: '2026-11-29', time: '10:00' })).body.error.code, 'slot_taken')
    assert.equal((await reschedule({ barberId: 'bima', date: '2026-11-29', time: '16:00' })).status, 200)
    assert.equal((await reschedule({ barberId: 'bima', date: '2026-11-29', time: '19:00' })).body.error.code, 'reschedule_limit')
  })

  test('batalkan saat menunggu DP: slot dilepas, pembayaran gagal, aman diulang', async () => {
    const before = await availability('2026-11-29')
    assert.ok(!slotOf(before, '16:00').barbers.includes('bima'))
    const cancelled = await api.post(`/api/reservations/${code}/cancel`, { phone })
    assert.equal(cancelled.status, 200)
    assert.equal(cancelled.body.reservation.status, 'dibatalkan')
    assert.ok(slotOf(await availability('2026-11-29'), '16:00').barbers.includes('bima'))
    const dp = await api.db.query(`SELECT p.status_pembayaran AS s FROM pembayaran p JOIN booking b ON b.id_booking = p.id_booking WHERE b.kode_booking = $1`, [code])
    assert.equal(dp.rows[0].s, 'gagal')
    assert.equal((await api.post(`/api/reservations/${code}/cancel`, { phone })).status, 200, 'batal dua kali tidak error')
    const reschedule = await api.post(`/api/reservations/${code}/reschedule`, { phone, barberId: 'bima', date: '2026-11-29', time: '17:00' })
    assert.equal(reschedule.body.error.code, 'not_active')
    assert.equal((await api.post('/api/reservations/lookup', { code, phone })).body.reservation.status, 'dibatalkan')
  })

  test('setelah DP dibayar, pembatalan lewat kasir (bukan lewat web)', async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-30', time: '14:00', barberId: 'bima', customerPhone: '081200099002' }))
    await api.confirmDp(created.body.reservation.code)
    const cancel = await api.post(`/api/reservations/${created.body.reservation.code}/cancel`, { phone: '081200099002' })
    assert.equal(cancel.status, 409)
    assert.equal(cancel.body.error.code, 'dp_sudah_dibayar')
    assert.equal((await api.post('/api/reservations/lookup', { code: created.body.reservation.code, phone: '081200099002' })).body.reservation.status, 'dikonfirmasi')
  })

  test('jadwal yang sudah lewat tidak bisa dibatalkan atau diubah', async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-25', time: '10:00', barberId: 'bima', customerPhone: '081200099003' }))
    api.at('2026-11-25T04:00:00Z') // 11:00 WIB, lewat dari 10:00
    try {
      assert.equal((await api.post(`/api/reservations/${created.body.reservation.code}/cancel`, { phone: '081200099003' })).body.error.code, 'already_started')
      assert.equal((await api.post(`/api/reservations/${created.body.reservation.code}/reschedule`, { phone: '081200099003', barberId: 'bima', date: '2026-11-26', time: '10:00' })).body.error.code, 'already_started')
    } finally {
      api.at('2026-11-25T02:00:00Z')
    }
  })
})

describe('batas waktu DP', () => {
  test('booking yang DP-nya tidak dibayar melepas slot lalu dibatalkan otomatis', async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-27', time: '19:00', barberId: 'andi', customerPhone: '081200099010' }))
    const code = created.body.reservation.code
    assert.ok(!slotOf(await availability('2026-11-27'), '19:00').barbers.includes('andi'), 'ditahan selama menunggu DP')

    api.advance(121) // lewat batas 120 menit
    assert.ok(slotOf(await availability('2026-11-27'), '19:00').barbers.includes('andi'), 'slot terbuka lagi walau worker belum jalan')
    const taken = await api.post('/api/reservations', booking({ date: '2026-11-27', time: '19:00', barberId: 'andi', customerPhone: '081200099011' }))
    assert.equal(taken.status, 201, 'orang lain bisa memesan slot itu')

    const messages = []
    const provider = { send: async (m) => messages.push(m) && { ref: 'x' } }
    for (let round = 0; round < 5; round++) await api.tick(provider) // tiap putaran maksimal 20 pesan; antrean tes berisi puluhan
    const row = (await api.db.query(`SELECT status_booking AS s, alasan_batal AS a FROM booking WHERE kode_booking = $1`, [code])).rows[0]
    assert.deepEqual(row, { s: 'dibatalkan', a: 'DP tidak dibayar tepat waktu' })
    const dp = await api.db.query(`SELECT p.status_pembayaran AS s FROM pembayaran p JOIN booking b ON b.id_booking = p.id_booking WHERE b.kode_booking = $1`, [code])
    assert.equal(dp.rows[0].s, 'kedaluwarsa')
    assert.ok(messages.some((m) => m.message.includes('BOOKING DIBATALKAN') && m.message.includes('DP tidak dibayar tepat waktu')))
    api.at('2026-11-25T02:00:00Z')
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
      for (let index = 0; index < 5; index++) statuses.push((await limited.post('/api/reservations/lookup', { code: 'PS-1234', phone: '081200000000' })).status)
      assert.deepEqual(statuses, [404, 404, 404, 429, 429])
    } finally {
      await limited.close()
    }
  })
})
