const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createMemoryProvider } = require('../src/notifications/providers')
const { startTestServer, booking, nextPhone } = require('./helpers')

/**
 * Riwayat booking per nomor WhatsApp, dibuka dengan kode OTP. Server dijalankan dengan OTP booking dimatikan (seperti demo) untuk memastikan
 * riwayat tetap wajib OTP walau OTP booking mati.
 */
let api
let provider
before(async () => {
  provider = createMemoryProvider()
  api = await startTestServer({ otpRequired: false, whatsappProvider: provider })
})
after(async () => {
  await api.close()
})

const normalized = (phone) => `62${phone.replace(/^0/, '')}`
const sentTo = (phone) => provider.sent.filter((item) => item.to === normalized(phone))
const codeFor = (phone) => /\*(\d{6})\*/.exec(sentTo(phone).at(-1)?.message ?? '')?.[1]
const requestHistoryCode = (phone) => api.post('/api/otp/request', { phone, purpose: 'history' })
const openHistory = (phone, otpCode) => api.post('/api/history', { phone, otpCode })

describe('riwayat booking', () => {
  test('nomor yang pernah memesan menerima kode dan melihat riwayatnya, paling baru dulu, hanya miliknya', async () => {
    const phone = nextPhone()
    const other = nextPhone()
    const first = await api.post('/api/reservations', booking({ customerPhone: phone, date: '2026-11-25', time: '16:00', hairstyle: 'Skin Fade' }))
    const second = await api.post('/api/reservations', booking({ customerPhone: phone, serviceId: 'premium-fade', date: '2026-11-27', time: '11:00', barberId: 'fajar' }))
    await api.post('/api/reservations', booking({ customerPhone: other, date: '2026-11-26', time: '13:00' }))
    assert.equal(first.status, 201)
    assert.equal(second.status, 201)

    const requested = await requestHistoryCode(phone)
    assert.equal(requested.status, 200)
    assert.match(requested.body.to, /^0812••••\d{3}$/)
    const code = codeFor(phone)
    assert.match(code, /^\d{6}$/)

    const history = await openHistory(phone, code)
    assert.equal(history.status, 200)
    assert.equal(history.body.customerName, 'Budi Santoso')
    assert.deepEqual(history.body.bookings.map((item) => item.code), [second.body.reservation.code, first.body.reservation.code], 'paling baru dulu')
    const [latest, older] = history.body.bookings
    assert.deepEqual([latest.serviceName, latest.barberName, latest.date, latest.time], ['Premium Fade', 'Fajar', '2026-11-27', '11:00'])
    assert.equal(older.hairstyle, 'Skin Fade')
    assert.ok(history.body.bookings.every((item) => item.customerPhone === normalized(phone)), 'tidak ada booking milik nomor lain')
    assert.ok(!JSON.stringify(history.body).includes('catatan'), 'catatan internal admin tidak ikut')
  })

  test('kode hanya sekali pakai, salah kode ditolak, dan tanpa kode tidak bisa dibuka', async () => {
    const phone = nextPhone()
    await api.post('/api/reservations', booking({ customerPhone: phone, date: '2026-11-26', time: '17:00' }))
    await requestHistoryCode(phone)
    const code = codeFor(phone)

    const wrong = await openHistory(phone, code === '000000' ? '111111' : '000000')
    assert.equal(wrong.status, 400)
    assert.equal(wrong.body.error.code, 'otp_invalid')

    assert.equal((await openHistory(phone, code)).status, 200)
    const reused = await openHistory(phone, code)
    assert.equal(reused.status, 400, 'kode sudah terpakai')
    assert.equal((await api.post('/api/history', { phone })).status, 400, 'tanpa kode')
  })

  test('nomor yang belum pernah memesan dijawab sama persis, tanpa mengirim WhatsApp dan tanpa membocorkan apa pun', async () => {
    const stranger = nextPhone()
    const known = nextPhone()
    await api.post('/api/reservations', booking({ customerPhone: known, date: '2026-11-26', time: '19:00' }))
    const before = provider.sent.length

    const unknown = await requestHistoryCode(stranger)
    const existing = await requestHistoryCode(known)
    assert.equal(unknown.status, 200)
    assert.deepEqual(Object.keys(unknown.body).sort(), Object.keys(existing.body).sort(), 'bentuk jawaban sama')
    assert.equal(provider.sent.length, before + 1, 'hanya nomor yang pernah memesan menerima kode')
    assert.equal(sentTo(stranger).length, 0)
    assert.equal((await openHistory(stranger, '123456')).status, 400)
  })

  test('kode untuk booking tidak membuat baris customer baru lewat jalur riwayat', async () => {
    const stranger = nextPhone()
    await requestHistoryCode(stranger)
    const rows = await api.db.query('SELECT count(*)::int AS n FROM customer WHERE no_whatsapp = $1', [normalized(stranger)])
    assert.equal(rows.rows[0].n, 0)
  })

  test('permintaan kode booking tetap butuh nama, kode riwayat tidak', async () => {
    assert.equal((await api.post('/api/otp/request', { phone: nextPhone() })).status, 400)
    assert.equal((await api.post('/api/otp/request', { phone: nextPhone(), customerName: 'Budi' })).status, 200)
  })
})
