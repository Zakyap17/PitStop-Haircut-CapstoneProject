const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createMemoryProvider } = require('../src/notifications/providers')
const { startTestServer, booking, nextPhone } = require('./helpers')

/** Verifikasi OTP WhatsApp sebelum booking: kode 6 digit, 5 menit, sekali pakai, 5 kali salah, jeda 60 detik, 3 permintaan per 10 menit. */
let api
let provider
before(async () => {
  provider = createMemoryProvider()
  api = await startTestServer({ otpRequired: true, whatsappProvider: provider })
})
after(async () => {
  await api.close()
})

const request = (phone, customerName = 'Budi Santoso') => api.post('/api/otp/request', { phone, customerName })
/** Kode terakhir yang dikirim ke nomor itu (dari isi pesan WhatsApp). */
const lastCode = (phone) => {
  const normalized = `62${phone.replace(/^0/, '')}`
  const message = [...provider.sent].reverse().find((item) => item.to === normalized)?.message ?? ''
  return /\*(\d{6})\*/.exec(message)?.[1]
}
const book = (phone, otpCode, overrides = {}) => api.post('/api/reservations', booking({ customerPhone: phone, otpCode, date: '2026-11-26', ...overrides }))

describe('meminta kode OTP', () => {
  test('kode terkirim ke WhatsApp, nomor tersamar, dan hanya hash yang tersimpan', async () => {
    const phone = nextPhone()
    const response = await request(phone)
    assert.equal(response.status, 200)
    assert.match(response.body.to, /^0812••••\d{3}$/)
    assert.deepEqual([response.body.expiresInSeconds, response.body.resendAfterSeconds], [300, 60])

    const code = lastCode(phone)
    assert.match(code, /^\d{6}$/)
    const message = provider.sent.at(-1).message
    assert.match(message, /KODE VERIFIKASI/)
    assert.match(message, /Jangan bagikan/)
    const stored = await api.db.query(`SELECT o.kode_otp_hash FROM otp_riwayat o JOIN customer c ON c.id_customer = o.id_customer WHERE c.no_whatsapp = $1`, [`62${phone.slice(1)}`])
    assert.equal(stored.rows.length, 1)
    assert.ok(!stored.rows[0].kode_otp_hash.includes(code), 'kode tidak tersimpan apa adanya')
    assert.match(stored.rows[0].kode_otp_hash, /^[0-9a-f]{64}$/)
  })

  test('nomor atau nama tidak valid ditolak sebelum mengirim apa pun', async () => {
    const before = provider.sent.length
    assert.equal((await request('12345')).status, 400)
    assert.equal((await api.post('/api/otp/request', { phone: nextPhone(), customerName: '' })).status, 400)
    assert.equal(provider.sent.length, before)
  })

  test('jeda 60 detik antar permintaan dan paling banyak 3 per 10 menit', async () => {
    const phone = nextPhone()
    assert.equal((await request(phone)).status, 200)
    const early = await request(phone)
    assert.equal(early.status, 429)
    assert.equal(early.body.error.code, 'otp_cooldown')

    api.advance(1.1)
    assert.equal((await request(phone)).status, 200)
    api.advance(1.1)
    assert.equal((await request(phone)).status, 200)
    api.advance(1.1)
    const limited = await request(phone)
    assert.equal(limited.status, 429)
    assert.equal(limited.body.error.code, 'otp_limit')

    api.advance(11)
    assert.equal((await request(phone)).status, 200, 'setelah 10 menit boleh minta lagi')
  })

  test('pengiriman WhatsApp gagal dijawab 502 dan tidak memakan jeda kirim ulang', async () => {
    const original = provider.send
    provider.send = async () => {
      throw new Error('perangkat Fonnte tidak terhubung')
    }
    const log = console.error
    console.error = () => {}
    const phone = nextPhone()
    try {
      const failed = await request(phone)
      assert.equal(failed.status, 502)
      assert.equal(failed.body.error.code, 'whatsapp_failed')
      assert.doesNotMatch(JSON.stringify(failed.body), /Fonnte/)
    } finally {
      provider.send = original
      console.error = log
    }
    assert.equal((await request(phone)).status, 200, 'langsung bisa minta lagi')
  })
})

describe('memakai kode untuk membuat booking', () => {
  test('tanpa kode atau kode salah ditolak, kode benar membuat booking', async () => {
    const phone = nextPhone()
    assert.equal((await book(phone, undefined, { time: '10:00' })).body.error.code, 'otp_required')
    await request(phone)
    const code = lastCode(phone)
    const wrong = code === '000000' ? '111111' : '000000'

    const rejected = await book(phone, wrong, { time: '10:00' })
    assert.equal(rejected.status, 400)
    assert.equal(rejected.body.error.code, 'otp_invalid')
    assert.match(rejected.body.error.message, /Sisa percobaan: 4/)

    const created = await book(phone, code, { time: '10:00' })
    assert.equal(created.status, 201)
    assert.equal(created.body.reservation.status, 'menunggu_pembayaran')
  })

  test('kode hanya bisa dipakai sekali', async () => {
    const phone = nextPhone()
    await request(phone)
    const code = lastCode(phone)
    assert.equal((await book(phone, code, { time: '11:00' })).status, 201)
    const again = await book(phone, code, { time: '12:00' })
    assert.equal(again.status, 400)
    assert.equal(again.body.error.code, 'otp_required')
  })

  test('kode terikat ke nomornya: kode milik nomor lain tidak berlaku', async () => {
    const owner = nextPhone()
    const other = nextPhone()
    await request(owner)
    await request(other)
    const ownerCode = lastCode(owner)
    const wrongForOther = lastCode(other) === ownerCode ? '123456' : ownerCode
    const response = await book(other, wrongForOther, { time: '13:00' })
    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'otp_invalid')
  })

  test('lima kali salah mengunci kode, kode yang benar pun tidak berlaku lagi', async () => {
    const phone = nextPhone()
    await request(phone)
    const code = lastCode(phone)
    const wrong = code === '000000' ? '111111' : '000000'
    let last
    for (let i = 0; i < 5; i += 1) last = await book(phone, wrong, { time: '14:00' })
    assert.equal(last.status, 429)
    assert.equal(last.body.error.code, 'otp_attempts')
    const afterLock = await book(phone, code, { time: '14:00' })
    assert.equal(afterLock.status, 429)

    api.advance(1.1)
    await request(phone)
    assert.equal((await book(phone, lastCode(phone), { time: '14:00' })).status, 201, 'kode baru berlaku')
  })

  test('kode kedaluwarsa setelah 5 menit', async () => {
    const phone = nextPhone()
    await request(phone)
    const code = lastCode(phone)
    api.advance(5.5)
    const response = await book(phone, code, { time: '15:00' })
    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'otp_expired')
  })

  test('booking gagal (slot keburu diambil) tidak menghanguskan kode', async () => {
    const first = nextPhone()
    await request(first)
    assert.equal((await book(first, lastCode(first), { time: '16:00', barberId: 'rizky' })).status, 201)

    const second = nextPhone()
    await request(second)
    const code = lastCode(second)
    const taken = await book(second, code, { time: '16:00', barberId: 'rizky' })
    assert.equal(taken.status, 409)
    assert.equal(taken.body.error.code, 'slot_taken')
    assert.equal((await book(second, code, { time: '17:00', barberId: 'rizky' })).status, 201, 'kode yang sama masih berlaku untuk slot lain')
  })
})

describe('pengaturan', () => {
  test('katalog memberi tahu web bahwa OTP wajib', async () => {
    assert.equal((await api.get('/api/catalog')).body.booking.otpRequired, true)
  })

  test('OTP dimatikan: booking dibuat tanpa kode, dan katalog melaporkannya', async () => {
    const open = await startTestServer({ otpRequired: false })
    try {
      assert.equal((await open.get('/api/catalog')).body.booking.otpRequired, false)
      assert.equal((await open.post('/api/reservations', booking({ date: '2026-11-26', time: '10:00' }))).status, 201)
    } finally {
      await open.close()
    }
  })
})
