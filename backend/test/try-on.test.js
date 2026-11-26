const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { createGeminiProvider, createOpenAiProvider, createOpenRouterProvider, createTryOnProviderFromEnv, parseAnalysis } = require('../src/tryon/providers')
const { startTestServer } = require('./helpers')

/** Base64 yang cukup panjang untuk lolos validasi ukuran minimum (isinya tidak dibaca oleh stub). */
const IMAGE = { mimeType: 'image/jpeg', base64: 'QUJD'.repeat(50) }
const body = (extra = {}) => ({ photo: IMAGE, reference: IMAGE, haircutName: 'Skin Fade', ...extra })

/** Penyedia pengganti: mencatat permintaan dan mengembalikan gambar tetap. Tidak memanggil layanan berbayar. */
function stubProvider() {
  const calls = []
  return {
    name: 'stub',
    calls,
    async generate(input) {
      calls.push(input)
      return { mimeType: 'image/png', base64: 'SElMTE8=' }
    },
    async analyze({ haircuts }) {
      calls.push({ analyzed: haircuts.length })
      return { faceDetected: true, faceShape: 'oval', hairType: 'lurus', summary: 'Cocok.', recommendedIds: haircuts.slice(0, 2).map((item) => item.id) }
    },
  }
}

describe('endpoint try-on', () => {
  test('belum aktif tanpa token: status false dan POST dijawab 503', async () => {
    const api = await startTestServer()
    try {
      assert.deepEqual((await api.get('/api/try-on/status')).body, { enabled: false, canGenerate: false })
      const response = await api.post('/api/try-on', body())
      assert.equal(response.status, 503)
      assert.equal(response.body.error.code, 'tryon_disabled')
    } finally {
      await api.close()
    }
  })

  test('aktif: foto diteruskan ke penyedia dan hasilnya dikembalikan sebagai data URL', async () => {
    const provider = stubProvider()
    const api = await startTestServer({ tryOnProvider: provider })
    try {
      assert.deepEqual((await api.get('/api/try-on/status')).body, { enabled: true, canGenerate: true })
      const response = await api.post('/api/try-on', body())
      assert.equal(response.status, 200)
      assert.equal(response.body.image, 'data:image/png;base64,SElMTE8=')
      assert.equal(provider.calls.length, 1)
      assert.equal(provider.calls[0].haircutName, 'Skin Fade')
    } finally {
      await api.close()
    }
  })

  test('foto yang bukan gambar atau bukan base64 ditolak 400 sebelum menyentuh penyedia', async () => {
    const provider = stubProvider()
    const api = await startTestServer({ tryOnProvider: provider })
    try {
      assert.equal((await api.post('/api/try-on', body({ photo: { mimeType: 'application/pdf', base64: IMAGE.base64 } }))).status, 400)
      assert.equal((await api.post('/api/try-on', body({ reference: { mimeType: 'image/png', base64: '!!!'.repeat(50) } }))).status, 400)
      assert.equal((await api.post('/api/try-on', body({ haircutName: '' }))).status, 400)
      assert.equal(provider.calls.length, 0)
    } finally {
      await api.close()
    }
  })

  test('penyedia gagal: pengguna dapat 502 ramah dan detail tidak bocor', async () => {
    const provider = {
      name: 'stub',
      async generate() {
        throw new Error('kunci sk-rahasia ditolak')
      },
    }
    const api = await startTestServer({ tryOnProvider: provider })
    const original = console.error
    console.error = () => {}
    try {
      const response = await api.post('/api/try-on', body())
      assert.equal(response.status, 502)
      assert.equal(response.body.error.code, 'tryon_failed')
      assert.doesNotMatch(JSON.stringify(response.body), /sk-rahasia/)
    } finally {
      console.error = original
      await api.close()
    }
  })

  test('batas percobaan: permintaan berlebih dijawab 429', async () => {
    const api = await startTestServer({ tryOnProvider: stubProvider(), limits: { write: 1000, access: 1000, tryOn: 2 } })
    try {
      const statuses = []
      for (let i = 0; i < 4; i += 1) statuses.push((await api.post('/api/try-on', body())).status)
      assert.deepEqual(statuses, [200, 200, 429, 429])
    } finally {
      await api.close()
    }
  })
})

describe('mode analisa saja', () => {
  test('analisa jalan, pasang gaya di foto dijawab 503 dan tidak menyentuh penyedia', async () => {
    const provider = stubProvider()
    const api = await startTestServer({ tryOnProvider: provider, tryOnGenerate: false })
    try {
      assert.deepEqual((await api.get('/api/try-on/status')).body, { enabled: true, canGenerate: false })
      assert.equal((await api.post('/api/try-on/analyze', { photo: IMAGE })).status, 200)
      const response = await api.post('/api/try-on', body())
      assert.equal(response.status, 503)
      assert.equal(response.body.error.code, 'tryon_generate_disabled')
      assert.deepEqual(provider.calls.map((call) => Object.keys(call)[0]), ['analyzed'])
    } finally {
      await api.close()
    }
  })
})

describe('analisa wajah', () => {
  test('mengembalikan bentuk wajah dan id gaya dari galeri toko', async () => {
    const provider = stubProvider()
    const api = await startTestServer({ tryOnProvider: provider })
    try {
      const response = await api.post('/api/try-on/analyze', { photo: IMAGE })
      assert.equal(response.status, 200)
      assert.equal(response.body.faceShape, 'oval')
      assert.equal(response.body.recommendedIds.length, 2)
      const catalog = (await api.get('/api/catalog')).body
      for (const id of response.body.recommendedIds) assert.ok(catalog.haircuts.some((haircut) => haircut.id === id))
    } finally {
      await api.close()
    }
  })

  test('wajah tidak terdeteksi dijawab 422 dan tanpa token dijawab 503', async () => {
    const noFace = { name: 'stub', async analyze() { return { faceDetected: false, faceShape: '', hairType: '', summary: '', recommendedIds: [] } } }
    const api = await startTestServer({ tryOnProvider: noFace })
    const disabled = await startTestServer()
    try {
      const response = await api.post('/api/try-on/analyze', { photo: IMAGE })
      assert.equal(response.status, 422)
      assert.equal(response.body.error.code, 'no_face')
      assert.equal((await disabled.post('/api/try-on/analyze', { photo: IMAGE })).status, 503)
      assert.equal((await api.post('/api/try-on/analyze', { photo: { mimeType: 'text/plain', base64: IMAGE.base64 } })).status, 400)
    } finally {
      await api.close()
      await disabled.close()
    }
  })

  test('jawaban AI: id di luar daftar dibuang, JSON rusak ditolak', () => {
    const haircuts = [{ id: 'a' }, { id: 'b' }]
    const reply = JSON.stringify({ faceDetected: true, faceShape: 'bulat', summary: 'x', recommendedIds: ['a', 'zzz', 'a', 'b'] })
    const fence = '`'.repeat(3)
    const parsed = parseAnalysis([fence + 'json', reply, fence].join(String.fromCharCode(10)), haircuts)
    assert.deepEqual(parsed.recommendedIds, ['a', 'b'])
    assert.throws(() => parseAnalysis('bukan json', haircuts), /JSON/)
    assert.throws(() => parseAnalysis('{"faceDetected":true,"recommendedIds":["zzz"]}', haircuts), /daftar/)
    assert.equal(parseAnalysis('{"faceDetected":false}', haircuts).faceDetected, false)
  })
})

describe('penyedia AI', () => {
  test('gemini: mengirim prompt dan dua gambar, membaca gambar dari jawaban', async () => {
    let request
    const fetchImpl = async (url, init) => {
      request = { url, init, payload: JSON.parse(init.body) }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }, { inlineData: { mimeType: 'image/png', data: 'AAAA' } }] } }] }), { status: 200 })
    }
    const provider = createGeminiProvider({ apiKey: 'kunci-uji', fetchImpl })
    const result = await provider.generate({ photo: IMAGE, reference: IMAGE, haircutName: 'Skin Fade' })
    assert.deepEqual(result, { mimeType: 'image/png', base64: 'AAAA' })
    assert.match(request.url, /gemini-2\.5-flash-image:generateContent$/)
    assert.equal(request.init.headers['x-goog-api-key'], 'kunci-uji')
    assert.equal(request.payload.contents[0].parts.length, 3)
    assert.match(request.payload.contents[0].parts[0].text, /Skin Fade/)
  })

  test('gemini: jawaban tanpa gambar atau ditolak menjadi error yang jelas', async () => {
    const blocked = createGeminiProvider({ apiKey: 'k', fetchImpl: async () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 }) })
    await assert.rejects(blocked.generate({ photo: IMAGE, reference: IMAGE, haircutName: 'x' }), /SAFETY/)
    const denied = createGeminiProvider({ apiKey: 'k', fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 }) })
    await assert.rejects(denied.generate({ photo: IMAGE, reference: IMAGE, haircutName: 'x' }), /400.*API key not valid/)
  })

  test('openai: mengirim form dengan dua gambar dan membaca b64_json', async () => {
    let request
    const fetchImpl = async (url, init) => {
      request = { url, init }
      return new Response(JSON.stringify({ data: [{ b64_json: 'BBBB' }] }), { status: 200 })
    }
    const provider = createOpenAiProvider({ apiKey: 'kunci-uji', fetchImpl })
    assert.deepEqual(await provider.generate({ photo: IMAGE, reference: IMAGE, haircutName: 'Skin Fade' }), { mimeType: 'image/png', base64: 'BBBB' })
    assert.equal(request.url, 'https://api.openai.com/v1/images/edits')
    assert.equal(request.init.headers.authorization, 'Bearer kunci-uji')
    assert.equal(request.init.body.getAll('image[]').length, 2)
  })

  test('openrouter: edit lewat /images dengan dua input_references, analisa lewat chat/completions', async () => {
    const requests = []
    const fetchImpl = async (url, init) => {
      requests.push({ url, init, payload: JSON.parse(init.body) })
      if (url.endsWith('/images')) return new Response(JSON.stringify({ data: [{ b64_json: 'CCCC', media_type: 'image/jpeg' }] }), { status: 200 })
      const reply = JSON.stringify({ faceDetected: true, faceShape: 'oval', hairType: 'lurus', summary: 'ok', recommendedIds: ['a', 'x'] })
      return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), { status: 200 })
    }
    const provider = createOpenRouterProvider({ apiKey: 'kunci-uji', fetchImpl })
    assert.deepEqual(await provider.generate({ photo: IMAGE, reference: IMAGE, haircutName: 'Skin Fade' }), { mimeType: 'image/jpeg', base64: 'CCCC' })
    const edit = requests[0]
    assert.equal(edit.url, 'https://openrouter.ai/api/v1/images')
    assert.equal(edit.init.headers.authorization, 'Bearer kunci-uji')
    assert.equal(edit.payload.input_references.length, 2)
    assert.equal(edit.payload.input_references[0].type, 'image_url')
    assert.match(edit.payload.input_references[0].image_url.url, /^data:image\/jpeg;base64,/)
    assert.equal(edit.payload.response_format, 'b64_json')

    const analysis = await provider.analyze({ photo: IMAGE, haircuts: [{ id: 'a', name: 'A', category: 'x' }] })
    assert.deepEqual(analysis.recommendedIds, ['a'])
    assert.equal(requests[1].url, 'https://openrouter.ai/api/v1/chat/completions')
    assert.match(requests[1].payload.model, /:free$/)
  })

  test('openrouter: model analisa yang penuh (429) dilewati, model berikutnya dipakai', async () => {
    const tried = []
    const reply = JSON.stringify({ faceDetected: true, faceShape: 'oval', summary: 'ok', recommendedIds: ['a'] })
    const fetchImpl = async (url, init) => {
      const model = JSON.parse(init.body).model
      tried.push(model)
      if (model === 'satu:free') return new Response(JSON.stringify({ error: { message: 'Provider returned error' } }), { status: 429 })
      return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), { status: 200 })
    }
    const provider = createOpenRouterProvider({ apiKey: 'k', analysisModel: 'satu:free, dua:free', fetchImpl })
    assert.deepEqual((await provider.analyze({ photo: IMAGE, haircuts: [{ id: 'a' }] })).recommendedIds, ['a'])
    assert.deepEqual(tried, ['satu:free', 'dua:free'])
  })

  test('openrouter: token salah (401) tidak mencoba model lain, semua penuh dilaporkan lengkap', async () => {
    let calls = 0
    const unauthorized = createOpenRouterProvider({ apiKey: 'k', analysisModel: 'a:free,b:free', fetchImpl: async () => (calls += 1) && new Response('{"error":{"message":"No auth"}}', { status: 401 }) })
    await assert.rejects(unauthorized.analyze({ photo: IMAGE, haircuts: [{ id: 'a' }] }), /401.*No auth/)
    assert.equal(calls, 1)
    const busy = createOpenRouterProvider({ apiKey: 'k', analysisModel: 'a:free,b:free', fetchImpl: async () => new Response('{}', { status: 429 }) })
    await assert.rejects(busy.analyze({ photo: IMAGE, haircuts: [{ id: 'a' }] }), /semua model analisa gagal.*a:free.*b:free/)
  })

  test('openrouter: penolakan (mis. saldo habis) menjadi error yang jelas', async () => {
    const provider = createOpenRouterProvider({ apiKey: 'k', fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'Insufficient credits' } }), { status: 402 }) })
    await assert.rejects(provider.generate({ photo: IMAGE, reference: IMAGE, haircutName: 'x' }), /402.*Insufficient credits/)
  })

  test('dari environment: tanpa token = null, provider salah = error', () => {
    assert.equal(createTryOnProviderFromEnv({}), null)
    assert.equal(createTryOnProviderFromEnv({ TRYON_API_KEY: '  ' }), null)
    assert.equal(createTryOnProviderFromEnv({ TRYON_API_KEY: 'k' }).name, 'gemini')
    assert.equal(createTryOnProviderFromEnv({ TRYON_API_KEY: 'k', TRYON_PROVIDER: 'OpenAI' }).name, 'openai')
    assert.equal(createTryOnProviderFromEnv({ TRYON_API_KEY: 'k', TRYON_PROVIDER: 'openrouter' }).name, 'openrouter')
    assert.throws(() => createTryOnProviderFromEnv({ TRYON_API_KEY: 'k', TRYON_PROVIDER: 'lain' }), /tidak dikenal/)
  })
})
