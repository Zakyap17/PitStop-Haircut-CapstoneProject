const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { normalizePhone, maskPhone } = require('../src/lib/phone')
const { createFonnteProvider, createMemoryProvider } = require('../src/notifications/providers')
const { processOutbox, scheduleReminders, MAX_ATTEMPTS } = require('../src/notifications/outbox')
const { startTestServer, booking } = require('./helpers')

const WEB_URL = 'https://pitstop.example.com'
let api
let provider

/** Menjalankan satu putaran worker (pengingat lalu pengiriman) dengan penyedia palsu dan jam tes. */
const tick = async () => {
  const reminders = await scheduleReminders({ db: api.db, clock: () => api.clock.current, webUrl: WEB_URL })
  const result = await processOutbox({ db: api.db, provider, clock: () => api.clock.current, log: () => {} })
  return { reminders, ...result }
}
const notifications = async (where = '') => (await api.db.query(`SELECT kind, recipient, status, attempts, last_error, message FROM notifications ${where} ORDER BY id`)).rows

before(async () => {
  api = await startTestServer({ webUrl: WEB_URL })
  provider = createMemoryProvider()
})
after(async () => {
  await api.close()
})

describe('nomor WhatsApp', () => {
  test('berbagai cara menulis nomor menjadi format internasional', () => {
    for (const input of ['081234567890', '0812-3456-7890', '+62 812 3456 7890', '6281234567890', '81234567890', '(0812) 3456.7890']) {
      assert.equal(normalizePhone(input), '6281234567890', input)
    }
  })
  test('menolak yang bukan nomor seluler Indonesia', () => {
    for (const input of ['', 'abc', '12345', '021-5551234', '0712345678', '08123', '0812345678901234567', null, undefined]) {
      assert.equal(normalizePhone(input), null, String(input))
    }
  })
  test('nomor disamarkan saat ditampilkan', () => {
    assert.equal(maskPhone('6281234567890'), '0812••••890')
    assert.equal(maskPhone(null), null)
  })
})

describe('invoice saat reservasi dibuat', () => {
  test('nomor wajib dan harus valid', async () => {
    const noPhone = await api.post('/api/reservations', { ...booking({ customerEmail: 'nophone@example.com' }), customerPhone: undefined })
    assert.equal(noPhone.status, 400)
    const bad = await api.post('/api/reservations', booking({ customerEmail: 'bad@example.com', customerPhone: '12345678' }))
    assert.equal(bad.status, 400)
    assert.equal(bad.body.error.code, 'invalid_phone')
    assert.equal((await notifications()).length, 0, 'reservasi yang ditolak tidak membuat pesan')
  })

  test('reservasi baru menulis invoice ke antrean, lalu terkirim ke nomor yang benar', async () => {
    const created = await api.post('/api/reservations', booking({ time: '14:00', customerEmail: 'inv@example.com', customerName: 'Budi Santoso', hairstyle: 'Low Taper Fade', customerPhone: '0812-3456-7890' }))
    assert.equal(created.status, 201)
    const r = created.body.reservation
    assert.deepEqual(r.invoice, { to: '0812••••890', status: 'pending' })
    assert.ok(!JSON.stringify(r).includes('81234567890'), 'nomor lengkap tidak dikirim ke klien')

    const queued = await notifications()
    assert.equal(queued.length, 1)
    assert.deepEqual([queued[0].kind, queued[0].recipient, queued[0].status], ['created', '6281234567890', 'pending'])

    assert.deepEqual(await tick(), { reminders: 0, sent: 1, failed: 0 })
    assert.equal(provider.sent.length, 1)
    const message = provider.sent[0].message
    assert.equal(provider.sent[0].to, '6281234567890')
    for (const expected of [
      'INVOICE RESERVASI', `*${r.code}*`, 'Budi Santoso', 'Haircut Dewasa (45 menit)', 'Rabu, 25 Nov 2026 · 14.00 WIB',
      'Kapster: Rizky', 'Low Taper Fade', 'Rp 50.000', 'Jl. Leuwi Panjang', 'https://maps.app.goo.gl/hhVQXvJ6JRuaVRMk6',
      `${WEB_URL}/cek-reservasi?kode=${r.code}`,
    ]) assert.ok(message.includes(expected), `pesan harus memuat: ${expected}\n${message}`)

    const lookup = await api.post('/api/reservations/lookup', { code: r.code, email: 'inv@example.com' })
    assert.deepEqual(lookup.body.reservation.invoice, { to: '0812••••890', status: 'sent' }, 'status terkirim terlihat di e-tiket')
    assert.deepEqual(await tick(), { reminders: 0, sent: 0, failed: 0 }, 'tidak dikirim dua kali')
  })

  test('gagal dikirim: dicoba ulang dengan jeda, lalu terkirim saat penyedia pulih', async () => {
    const created = await api.post('/api/reservations', booking({ time: '15:00', barberId: 'bima', customerEmail: 'retry@example.com' }))
    const code = created.body.reservation.code
    provider.failNext = 2
    const sentBefore = provider.sent.length

    assert.deepEqual(await tick(), { reminders: 0, sent: 0, failed: 1 })
    let row = (await notifications(`WHERE message LIKE '%${code}%'`))[0]
    assert.deepEqual([row.status, row.attempts], ['pending', 1])
    assert.match(row.last_error, /gagal sengaja/)

    assert.deepEqual(await tick(), { reminders: 0, sent: 0, failed: 0 }, 'belum waktunya dicoba lagi')
    api.at(new Date(api.clock.current.getTime() + 60_000).toISOString()) // +60 detik, lewat jeda 30 detik
    assert.deepEqual(await tick(), { reminders: 0, sent: 0, failed: 1 })
    api.at(new Date(api.clock.current.getTime() + 5 * 60_000).toISOString()) // +5 menit, lewat jeda 2 menit
    assert.deepEqual(await tick(), { reminders: 0, sent: 1, failed: 0 })
    row = (await notifications(`WHERE message LIKE '%${code}%'`))[0]
    assert.deepEqual([row.status, row.attempts, row.last_error], ['sent', 3, null])
    assert.equal(provider.sent.length, sentBefore + 1)
    api.at('2026-11-25T02:00:00Z')
  })

  test('terus gagal: ditandai failed setelah batas percobaan, dan pemesanan tetap berhasil', async () => {
    const created = await api.post('/api/reservations', booking({ time: '16:00', barberId: 'fajar', customerEmail: 'down@example.com' }))
    assert.equal(created.status, 201, 'WhatsApp bermasalah tidak menggagalkan pemesanan')
    const code = created.body.reservation.code
    provider.failNext = 100
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      api.at(new Date(api.clock.current.getTime() + 2 * 60 * 60_000).toISOString())
      await tick()
    }
    provider.failNext = 0
    const row = (await notifications(`WHERE message LIKE '%${code}%'`))[0]
    assert.deepEqual([row.status, row.attempts], ['failed', MAX_ATTEMPTS])
    api.at('2026-11-25T02:00:00Z')
    const lookup = await api.post('/api/reservations/lookup', { code, email: 'down@example.com' })
    assert.equal(lookup.body.reservation.invoice.status, 'failed')
    assert.equal(lookup.body.reservation.status, 'confirmed')
  })
})

describe('ubah, batal, dan pengingat', () => {
  let code
  const email = 'flow@example.com'
  before(async () => {
    // Jam server dikembalikan ke 09:00 Rabu. Jadwal: Jumat 27 Nov 14:00 (lebih dari 2 jam lagi).
    api.at('2026-11-25T02:00:00Z')
    const created = await api.post('/api/reservations', booking({ date: '2026-11-27', time: '14:00', barberId: 'rizky', customerEmail: email }))
    code = created.body.reservation.code
    await tick()
  })

  test('ubah jadwal mengirim kabar dan membawa jadwal baru', async () => {
    const before = provider.sent.length
    const changed = await api.post(`/api/reservations/${code}/reschedule`, { email, barberId: 'bima', date: '2026-11-28', time: '11:00' })
    assert.equal(changed.status, 200)
    await tick()
    assert.equal(provider.sent.length, before + 1)
    const message = provider.sent.at(-1).message
    for (const expected of ['JADWAL DIUBAH', code, 'Sabtu, 28 Nov 2026 · 11.00 WIB', 'Kapster: Bima']) assert.ok(message.includes(expected), expected)
  })

  test('pengingat: belum dikirim sebelum 2 jam, dikirim sekali saat jadwal tinggal 2 jam', async () => {
    api.at('2026-11-28T00:00:00Z') // Sabtu 07:00 WIB, 4 jam sebelum 11:00
    assert.equal((await tick()).reminders, 0)
    api.at('2026-11-28T02:30:00Z') // 09:30 WIB, 1,5 jam sebelum
    const first = await tick()
    assert.deepEqual([first.reminders, first.sent], [1, 1])
    const reminder = provider.sent.at(-1).message
    for (const expected of ['PENGINGAT RESERVASI', 'Halo Budi Santoso', code, '11.00 WIB']) assert.ok(reminder.includes(expected), expected)
    assert.deepEqual(await tick(), { reminders: 0, sent: 0, failed: 0 }, 'pengingat hanya sekali')
  })

  test('mengubah jadwal mengatur ulang pengingat untuk jadwal baru', async () => {
    api.at('2026-11-28T02:40:00Z') // masih Sabtu, 09:40 WIB
    await api.post(`/api/reservations/${code}/reschedule`, { email, barberId: 'bima', date: '2026-11-29', time: '19:00' })
    assert.deepEqual((await tick()).reminders, 0, 'jadwal baru masih jauh')
    const sentBefore = provider.sent.length
    api.at('2026-11-29T10:30:00Z') // Minggu 17:30 WIB, 1,5 jam sebelum 19:00
    const result = await tick()
    assert.equal(result.reminders, 1, 'pengingat baru untuk jadwal baru')
    assert.ok(provider.sent.length > sentBefore)
    assert.ok(provider.sent.at(-1).message.includes('19.00 WIB'))
  })

  test('batal mengirim kabar, tidak ada pengingat untuk reservasi batal, dan batal dua kali tidak mengirim ulang', async () => {
    const created = await api.post('/api/reservations', booking({ date: '2026-11-30', time: '13:00', barberId: 'andi', customerEmail: 'cancel@example.com' }))
    const cancelCode = created.body.reservation.code
    api.at('2026-11-29T10:35:00Z')
    await tick()
    const cancel = () => api.post(`/api/reservations/${cancelCode}/cancel`, { email: 'cancel@example.com' })
    assert.equal((await cancel()).status, 200)
    const before = provider.sent.length
    await tick()
    assert.equal(provider.sent.length, before + 1)
    assert.ok(provider.sent.at(-1).message.includes('RESERVASI DIBATALKAN'))
    assert.equal((await cancel()).status, 200)
    assert.deepEqual(await tick(), { reminders: 0, sent: 0, failed: 0 }, 'batal kedua tidak membuat pesan baru')

    api.at('2026-11-30T09:30:00Z') // 16:30 WIB, setelah jadwal 13:00 yang dibatalkan
    api.at('2026-11-30T04:00:00Z') // 11:00 WIB, 2 jam sebelum 13:00
    const sentBefore = provider.sent.length
    await tick()
    assert.ok(!provider.sent.slice(sentBefore).some((item) => item.message.includes(cancelCode)), 'tidak ada pengingat untuk reservasi yang dibatalkan')
    api.at('2026-11-25T02:00:00Z')
  })

  test('booking yang jadwalnya sudah dekat tidak mendapat pengingat setelah invoice', async () => {
    api.at('2026-11-25T02:00:00Z') // 09:00 WIB
    const created = await api.post('/api/reservations', booking({ date: '2026-11-25', time: '10:00', barberId: 'fajar', customerEmail: 'dekat@example.com' }))
    const result = await tick() // jadwal 10:00 tinggal 60 menit: invoice terkirim, tanpa pengingat
    assert.deepEqual([result.reminders, result.sent], [0, 1])
    assert.ok(provider.sent.at(-1).message.includes('INVOICE RESERVASI'))
    assert.ok(provider.sent.at(-1).message.includes(created.body.reservation.code))
  })
})

describe('penyedia Fonnte', () => {
  const okFetch = (capture) => async (url, init) => {
    capture.url = url
    capture.init = init
    return { ok: true, status: 200, json: async () => ({ status: true, id: ['123', '456'], process: 'pending' }) }
  }

  test('mengirim ke alamat dan format yang benar', async () => {
    const capture = {}
    const fonnte = createFonnteProvider({ token: 'TOKEN-RAHASIA', fetchImpl: okFetch(capture) })
    const result = await fonnte.send({ to: '6281234567890', message: 'halo' })
    assert.equal(capture.url, 'https://api.fonnte.com/send')
    assert.equal(capture.init.method, 'POST')
    assert.equal(capture.init.headers.Authorization, 'TOKEN-RAHASIA')
    assert.equal(capture.init.body.get('target'), '6281234567890')
    assert.equal(capture.init.body.get('message'), 'halo')
    assert.equal(result.ref, '123,456')
  })

  test('penolakan dan gangguan jaringan menjadi error yang jelas', async () => {
    const rejected = createFonnteProvider({ token: 't', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: false, reason: 'device disconnected' }) }) })
    await assert.rejects(rejected.send({ to: '62812', message: 'x' }), /Fonnte menolak pesan: device disconnected/)
    const down = createFonnteProvider({ token: 't', fetchImpl: async () => { throw new Error('ECONNREFUSED') } })
    await assert.rejects(down.send({ to: '62812', message: 'x' }), /Fonnte tidak terjangkau: ECONNREFUSED/)
    const html = createFonnteProvider({ token: 't', fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new Error('bukan json') } }) })
    await assert.rejects(html.send({ to: '62812', message: 'x' }), /HTTP 502/)
  })

  test('tanpa token ditolak sejak awal', () => {
    assert.throws(() => createFonnteProvider({ token: '' }), /FONNTE_TOKEN/)
  })
})
