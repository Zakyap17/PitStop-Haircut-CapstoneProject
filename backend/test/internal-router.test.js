const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createApp } = require('../src/app')
const { createDb } = require('../src/db')
const { runMigrations } = require('../src/db/migrate')
const { internalRouter } = require('../src/internal/router')

describe('web internal dan web customer di satu backend', () => {
  let db
  let server
  let base

  before(async () => {
    db = await createDb({ databaseUrl: '', dataDir: undefined })
    await runMigrations(db)
    const app = createApp({ db, limits: { write: 1000, access: 1000 }, internalRouter })
    server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    })
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await db.close()
  })

  const send = (method, path, { body, headers } = {}) =>
    fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })

  test('rute internal terpasang dan butuh login atau database (bukan 404)', async () => {
    const me = await send('GET', '/api/internal/auth/me')
    assert.ok([401, 503].includes(me.status), `status ${me.status}`)
    const dashboard = await send('GET', '/api/internal/dashboard')
    assert.ok([401, 503].includes(dashboard.status), `status ${dashboard.status}`)
  })

  test('rute customer tetap jalan dan /api/health milik API customer', async () => {
    const catalog = await send('GET', '/api/catalog')
    assert.equal(catalog.status, 200)
    const health = await send('GET', '/api/health')
    assert.equal(health.status, 200)
    const unknown = await send('GET', '/api/tidak-ada')
    assert.equal(unknown.status, 404)
  })

  test('permintaan tulis dari asal yang tidak diizinkan ditolak sebelum menyentuh data', async () => {
    const response = await send('POST', '/api/internal/auth/login', { body: { email: 'a@b.c', password: 'x' }, headers: { origin: 'https://situs-lain.example' } })
    assert.equal(response.status, 403)
  })

  test('CORS internal memakai kredensial, CORS customer tidak berubah', async () => {
    const internal = await send('OPTIONS', '/api/internal/auth/me', { headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'GET' } })
    assert.equal(internal.headers.get('access-control-allow-credentials'), 'true')
    const customer = await send('OPTIONS', '/api/catalog', { headers: { origin: 'https://apa-saja.example', 'access-control-request-method': 'GET' } })
    assert.equal(customer.headers.get('access-control-allow-credentials'), null)
  })

  test('batas isi: internal boleh besar (foto), customer tetap 20 KB', async () => {
    const big = 'a'.repeat(100_000)
    const internal = await send('POST', '/api/internal/auth/login', { body: { email: big, password: 'x' } })
    assert.notEqual(internal.status, 413, 'login internal tidak boleh ditolak karena ukuran 100 KB')
    const customer = await send('POST', '/api/reservations', { body: { name: big } })
    assert.equal(customer.status, 413)
  })
})

describe('API internal berdiri sendiri (SERVICE=internal)', () => {
  const { createInternalApp } = require('../src/internal/server')
  let server
  let base

  before(async () => {
    server = await new Promise((resolve) => {
      const instance = createInternalApp().listen(0, '127.0.0.1', () => resolve(instance))
    })
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  test('health internal menjawab 200 selama proses hidup', async () => {
    const response = await fetch(base + '/api/internal/health')
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.service, 'pitstop-internal')
  })

  test('rute internal ada, rute customer tidak ada di proses ini', async () => {
    const me = await fetch(base + '/api/internal/auth/me')
    assert.ok([401, 503].includes(me.status), `status ${me.status}`)
    for (const path of ['/api/catalog', '/api/otp/request', '/api/reservations', '/api/health']) {
      const response = await fetch(base + path)
      assert.equal(response.status, 404, `${path} harus 404 di server internal`)
    }
  })
})
