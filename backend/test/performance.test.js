const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { cached } = require('../src/lib/ttl-cache')
const { requestOtp } = require('../src/services/otp')
const { startTestServer } = require('./helpers')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe('cache singkat untuk database jauh', () => {
  test('database pg: hasil dipakai ulang sampai kedaluwarsa, yang gagal tidak disimpan', async () => {
    const db = { driver: 'pg' }
    let loads = 0
    const load = async () => ++loads
    assert.equal(await cached(db, 'a', 60, load), 1)
    assert.equal(await cached(db, 'a', 60, load), 1, 'dari cache')
    assert.equal(await cached(db, 'b', 60, load), 2, 'kunci lain dimuat sendiri')
    await sleep(80)
    assert.equal(await cached(db, 'a', 60, load), 3, 'sudah kedaluwarsa, dimuat ulang')

    let attempts = 0
    const flaky = async () => {
      attempts += 1
      if (attempts === 1) throw new Error('jaringan putus')
      return 'ok'
    }
    await assert.rejects(cached(db, 'c', 1000, flaky), /jaringan putus/)
    assert.equal(await cached(db, 'c', 1000, flaky), 'ok', 'setelah gagal, permintaan berikutnya mencoba lagi')
  })

  test('permintaan serentak berbagi satu pemuatan', async () => {
    const db = { driver: 'pg' }
    let loads = 0
    const load = async () => {
      loads += 1
      await sleep(20)
      return loads
    }
    const results = await Promise.all([cached(db, 'k', 1000, load), cached(db, 'k', 1000, load), cached(db, 'k', 1000, load)])
    assert.deepEqual(results, [1, 1, 1])
  })

  test('database tertanam (dev dan tes) tidak memakai cache supaya perubahan langsung terlihat', async () => {
    const db = { driver: 'pglite' }
    let loads = 0
    const load = async () => ++loads
    assert.equal(await cached(db, 'a', 1000, load), 1)
    assert.equal(await cached(db, 'a', 1000, load), 2)
  })
})

describe('kirim OTP tidak menunggu WhatsApp terlalu lama', () => {
  let api
  before(async () => {
    api = await startTestServer({ otpRequired: true })
  })
  after(async () => {
    await api.close()
  })
  const clock = () => new Date('2026-11-25T02:00:00Z')

  test('pengiriman lambat: jawaban dikirim dulu setelah batas tunggu, kodenya tetap berlaku', async () => {
    const sent = []
    const slow = {
      name: 'lambat',
      send: async (message) => {
        await sleep(400)
        sent.push(message)
      },
    }
    const started = Date.now()
    const result = await requestOtp({ db: api.db, clock, whatsappProvider: slow, otpSendWaitMs: 50 }, { phone: '081255500001', customerName: 'Budi' })
    assert.ok(Date.now() - started < 300, 'tidak menunggu pengiriman sampai selesai')
    assert.match(result.to, /^0812••••\d{3}$/)
    await sleep(450)
    assert.equal(sent.length, 1, 'pesan tetap terkirim di latar')
    const rows = await api.db.query(`SELECT count(*)::int AS n FROM otp_riwayat o JOIN customer c ON c.id_customer = o.id_customer WHERE c.no_whatsapp = '6281255500001'`)
    assert.equal(rows.rows[0].n, 1, 'kode tetap tersimpan')
  })

  test('pengiriman lambat lalu gagal: baris kode dibatalkan supaya bisa minta lagi tanpa jeda', async () => {
    const failingLate = {
      name: 'gagal-belakangan',
      send: async () => {
        await sleep(200)
        throw new Error('perangkat terputus')
      },
    }
    const log = console.error
    console.error = () => {}
    try {
      await requestOtp({ db: api.db, clock, whatsappProvider: failingLate, otpSendWaitMs: 30 }, { phone: '081255500002', customerName: 'Budi' })
      await sleep(350)
    } finally {
      console.error = log
    }
    const rows = await api.db.query(`SELECT count(*)::int AS n FROM otp_riwayat o JOIN customer c ON c.id_customer = o.id_customer WHERE c.no_whatsapp = '6281255500002'`)
    assert.equal(rows.rows[0].n, 0)
  })

  test('pengiriman gagal cepat tetap dijawab 502 seperti sebelumnya', async () => {
    const failing = {
      name: 'gagal',
      send: async () => {
        throw new Error('token salah')
      },
    }
    const log = console.error
    console.error = () => {}
    try {
      await assert.rejects(requestOtp({ db: api.db, clock, whatsappProvider: failing }, { phone: '081255500003', customerName: 'Budi' }), (error) => error.status === 502 && error.code === 'whatsapp_failed')
    } finally {
      console.error = log
    }
  })
})
