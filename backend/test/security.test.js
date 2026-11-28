const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createApp } = require('../src/app')
const { createDb } = require('../src/db')
const { runMigrations } = require('../src/db/migrate')
const { startTestServer, booking } = require('./helpers')

describe('karakter null ditolak sebelum menyentuh database', () => {
  let api
  before(async () => {
    api = await startTestServer()
  })
  after(async () => {
    await api.close()
  })

  const nul = '\u0000'

  test('di body (nama, layanan, kapster, kode, nomor) dan di body bersarang -> 400, bukan 500', async () => {
    const attempts = [
      ['/api/reservations', booking({ customerName: `Bu${nul}di` })],
      ['/api/reservations', booking({ serviceId: `haircut${nul}` })],
      ['/api/reservations', booking({ barberId: `riz${nul}ky` })],
      ['/api/reservations', booking({ hairstyle: `Fade${nul}` })],
      ['/api/reservations/lookup', { code: `PS${nul}1`, phone: '081234567890' }],
      ['/api/otp/request', { phone: `0812${nul}34567890`, customerName: 'Budi' }],
      ['/api/reservations/lookup', { code: 'PS-1', phone: '081234567890', nested: { deep: [{ x: `a${nul}b` }] } }],
      ['/api/reservations/lookup', { code: 'PS-1', phone: '081234567890', [`k${nul}ey`]: 1 }],
    ]
    for (const [path, body] of attempts) {
      const response = await api.post(path, body)
      assert.equal(response.status, 400, `${path} ${JSON.stringify(body).slice(0, 60)} -> ${response.status}`)
      assert.equal(response.body.error.code, 'invalid_input')
    }
  })

  test('di query dan di alamat (%00) -> 400', async () => {
    assert.equal((await api.get('/api/availability?date=2026-11-25&serviceId=x%00y')).status, 400)
    assert.equal((await api.get('/api/barbers/%00/photo')).status, 400)
    assert.equal((await api.get('/api/barbers/ri%00zky/photo')).status, 400)
  })

  test('permintaan normal dan karakter Unicode biasa tetap diterima', async () => {
    const ok = await api.post('/api/reservations', booking({ customerName: 'Budi Santoso 💈 Ñandú', time: '10:00' }))
    assert.equal(ok.status, 201, JSON.stringify(ok.body))
    assert.equal((await api.get('/api/barbers/hantu/photo')).status, 404)
  })
})

describe('pembatas laju per klien di belakang proxy (TRUST_PROXY)', () => {
  /** API dengan batas akses 5 per jendela dan trust proxy yang dipilih. */
  async function start(trustProxy) {
    const db = await createDb({ databaseUrl: '', dataDir: undefined })
    await runMigrations(db)
    const app = createApp({ db, trustProxy, limits: { write: 1000, access: 5 } })
    const server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    })
    const base = `http://127.0.0.1:${server.address().port}`
    const lookup = async (xff) =>
      (await fetch(`${base}/api/reservations/lookup`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': xff }, body: JSON.stringify({ code: 'PS-0001', phone: '081234567890' }) })).status
    return { lookup, close: async () => { await new Promise((resolve) => server.close(resolve)); await db.close() } }
  }

  test('tanpa TRUST_PROXY semua klien berbagi satu batas (perilaku yang diperingatkan)', async () => {
    const api = await start(undefined)
    try {
      for (let i = 0; i < 5; i++) await api.lookup(`203.0.113.${i}`)
      assert.equal(await api.lookup('198.51.100.1'), 429, 'klien baru ikut terkunci karena batas dipakai bersama')
    } finally {
      await api.close()
    }
  })

  test('dengan TRUST_PROXY=1 tiap klien punya batas sendiri; yang rakus tidak mengunci yang lain', async () => {
    const api = await start('1')
    try {
      const rakus = []
      for (let i = 0; i < 7; i++) rakus.push(await api.lookup('203.0.113.50'))
      assert.deepEqual(rakus.map((s) => s === 429), [false, false, false, false, false, true, true])
      assert.notEqual(await api.lookup('198.51.100.1'), 429, 'klien lain tidak terkena')
    } finally {
      await api.close()
    }
  })
})
