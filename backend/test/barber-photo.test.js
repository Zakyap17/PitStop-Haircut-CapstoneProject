const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { startTestServer } = require('./helpers')

/** PNG 1x1 yang valid, dipakai sebagai foto uji. */
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

let api
before(async () => {
  api = await startTestServer()
  await api.db.query(`UPDATE capster SET foto = $1 WHERE slug = 'rizky'`, [`data:image/png;base64,${PNG_BASE64}`])
  await api.db.query(`UPDATE capster SET foto = '/images/barbers/fajar.jpg' WHERE slug = 'fajar'`)
})
after(async () => {
  await api.close()
})

describe('foto capster', () => {
  test('katalog memuat alamat foto: data URL lewat endpoint, path apa adanya, tanpa foto = null', async () => {
    const { body } = await api.get('/api/catalog')
    const byId = Object.fromEntries(body.barbers.map((barber) => [barber.id, barber]))
    assert.equal(byId.rizky.photo, '/api/barbers/rizky/photo')
    assert.equal(byId.fajar.photo, '/images/barbers/fajar.jpg')
    assert.equal(byId.bima.photo, null)
    assert.ok(!JSON.stringify(body).includes(PNG_BASE64), 'isi foto tidak ikut dikirim di katalog')
  })

  test('endpoint foto mengembalikan gambarnya dengan tipe yang benar', async () => {
    const response = await fetch(`${api.base}/api/barbers/rizky/photo`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/png')
    assert.match(response.headers.get('cache-control'), /max-age/)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(PNG_BASE64, 'base64'))
  })

  test('foto berupa path diarahkan, capster tanpa foto atau tidak dikenal dijawab 404', async () => {
    const redirect = await fetch(`${api.base}/api/barbers/fajar/photo`, { redirect: 'manual' })
    assert.equal(redirect.status, 302)
    assert.equal(redirect.headers.get('location'), '/images/barbers/fajar.jpg')
    assert.equal((await fetch(`${api.base}/api/barbers/bima/photo`)).status, 404)
    assert.equal((await fetch(`${api.base}/api/barbers/tidak-ada/photo`)).status, 404)
  })
})
