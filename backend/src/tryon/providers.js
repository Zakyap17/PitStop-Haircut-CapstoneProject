/**
 * Penyedia AI untuk Virtual Try-On. Semuanya punya satu bentuk:
 *   generate({ photo, reference, haircutName }) -> { mimeType, base64 }   (ganti rambut di foto)
 *   analyze({ photo, haircuts }) -> { faceDetected, faceShape, hairType, summary, recommendedIds }   (analisa wajah + pilih gaya cocok)
 * `photo` dan `reference` berbentuk { mimeType, base64 }. Gagal = melempar Error berpesan yang bisa dibaca.
 *
 *  - gemini : Google Gemini (model gambar), default model gemini-2.5-flash-image. Kunci dari https://aistudio.google.com/apikey
 *  - openai : OpenAI Images (edits), default model gpt-image-1. Kunci dari https://platform.openai.com/api-keys
 *  - openrouter : OpenRouter, satu token untuk banyak model (analisa wajah bisa gratis, pemasangan gaya berbayar murah). Kunci dari https://openrouter.ai/keys
 *
 * Token hanya dibaca di backend dari .env. Tidak pernah dikirim ke browser dan tidak pernah dicetak ke log.
 */
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENAI_EDITS = 'https://api.openai.com/v1/images/edits'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

/** Instruksi ke AI: hanya ganti rambut, semua yang lain harus tetap. Sama untuk semua penyedia. */
function buildPrompt(haircutName) {
  return [
    'Image 1 is a photo of a real customer. Image 2 is a reference photo of the haircut "' + haircutName + '".',
    "Edit image 1 so the customer's hair becomes exactly the haircut shown in image 2 (same cut, length, volume, fade and styling).",
    'Keep everything else in image 1 unchanged: face, identity, facial features, skin tone, expression, head pose, clothing, background and lighting.',
    'The result must look like a natural, photorealistic photograph with a realistic hairline. Do not add text, watermarks or extra people.',
    'Return a single image.',
  ].join(' ')
}

/** Prompt analisa: AI menilai wajah di foto lalu memilih gaya dari daftar toko (hanya id dari daftar yang dipakai). */
function buildAnalysisPrompt(haircuts) {
  const list = haircuts.map((item) => `- ${item.id}: ${item.name} (${item.category})`).join('\n')
  return [
    'You are a professional barber. Look at the customer photo and judge which haircuts from the shop list suit their face.',
    'Reply with JSON only, with exactly these keys:',
    '{"faceDetected": boolean, "faceShape": one of "oval" | "bulat" | "persegi" | "lonjong" | "hati" | "berlian", "hairType": short description in Indonesian (for example "lurus tebal"), "summary": one or two sentences in Indonesian explaining why the chosen styles suit this face, "recommendedIds": array of 3 to 5 ids from the list, best match first}.',
    'If there is no clear human face in the photo, set faceDetected to false and use empty values for the rest.',
    'Only use ids that appear in this list:',
    list,
  ].join('\n')
}

/** Membaca jawaban analisa dari AI dan hanya menyisakan id yang benar-benar ada di daftar toko. */
function parseAnalysis(raw, haircuts) {
  let data
  try {
    data = JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    throw new Error('Jawaban analisa bukan JSON yang valid.')
  }
  if (!data || data.faceDetected === false) return { faceDetected: false, faceShape: '', hairType: '', summary: '', recommendedIds: [] }
  const known = new Set(haircuts.map((item) => item.id))
  const recommendedIds = [...new Set((Array.isArray(data.recommendedIds) ? data.recommendedIds : []).filter((id) => known.has(id)))].slice(0, 5)
  if (!recommendedIds.length) throw new Error('Analisa tidak memilih gaya yang ada di daftar.')
  return {
    faceDetected: true,
    faceShape: String(data.faceShape ?? '').slice(0, 30),
    hairType: String(data.hairType ?? '').slice(0, 60),
    summary: String(data.summary ?? '').slice(0, 400),
    recommendedIds,
  }
}

async function readError(response) {
  const text = await response.text().catch(() => '')
  try {
    const data = JSON.parse(text)
    return data?.error?.message || text.slice(0, 200)
  } catch {
    return text.slice(0, 200)
  }
}

function createGeminiProvider({ apiKey, model = 'gemini-2.5-flash-image', analysisModel = 'gemini-2.5-flash', timeoutMs = 90_000, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('TRYON_API_KEY wajib diisi.')
  return {
    name: 'gemini',
    async generate({ photo, reference, haircutName }) {
      const response = await fetchImpl(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: buildPrompt(haircutName) },
                { inline_data: { mime_type: photo.mimeType, data: photo.base64 } },
                { inline_data: { mime_type: reference.mimeType, data: reference.base64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`Gemini menolak permintaan (${response.status}): ${await readError(response)}`)
      const data = await response.json()
      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const image = parts.map((part) => part.inlineData ?? part.inline_data).find((inline) => inline?.data)
      if (!image) {
        const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'tidak ada gambar di jawaban'
        throw new Error(`Gemini tidak mengembalikan gambar (${reason}).`)
      }
      return { mimeType: image.mimeType ?? image.mime_type ?? 'image/png', base64: image.data }
    },
    async analyze({ photo, haircuts }) {
      const response = await fetchImpl(`${GEMINI_BASE}/${encodeURIComponent(analysisModel)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildAnalysisPrompt(haircuts) }, { inline_data: { mime_type: photo.mimeType, data: photo.base64 } }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`Gemini menolak analisa (${response.status}): ${await readError(response)}`)
      const data = await response.json()
      const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text).find(Boolean)
      if (!text) throw new Error(`Gemini tidak mengembalikan analisa (${data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'kosong'}).`)
      return parseAnalysis(text, haircuts)
    },
  }
}

function createOpenAiProvider({ apiKey, model = 'gpt-image-1', analysisModel = 'gpt-4.1-mini', timeoutMs = 120_000, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('TRYON_API_KEY wajib diisi.')
  const toBlob = ({ mimeType, base64 }) => new Blob([Buffer.from(base64, 'base64')], { type: mimeType })
  return {
    name: 'openai',
    async generate({ photo, reference, haircutName }) {
      const form = new FormData()
      form.set('model', model)
      form.set('prompt', buildPrompt(haircutName))
      form.append('image[]', toBlob(photo), 'foto.png')
      form.append('image[]', toBlob(reference), 'referensi.png')
      form.set('size', 'auto')
      const response = await fetchImpl(OPENAI_EDITS, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`OpenAI menolak permintaan (${response.status}): ${await readError(response)}`)
      const data = await response.json()
      const base64 = data?.data?.[0]?.b64_json
      if (!base64) throw new Error('OpenAI tidak mengembalikan gambar.')
      return { mimeType: 'image/png', base64 }
    },
    async analyze({ photo, haircuts }) {
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: analysisModel,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: buildAnalysisPrompt(haircuts) },
                { type: 'image_url', image_url: { url: `data:${photo.mimeType};base64,${photo.base64}` } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`OpenAI menolak analisa (${response.status}): ${await readError(response)}`)
      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content
      if (!text) throw new Error('OpenAI tidak mengembalikan analisa.')
      return parseAnalysis(text, haircuts)
    },
  }
}

/**
 * OpenRouter: satu token untuk banyak model. Pemasangan gaya lewat POST /images (edit foto = prompt + input_references),
 * analisa wajah lewat POST /chat/completions dengan model vision. Model bawaan analisa berakhiran :free (gratis, ada batas harian).
 * Model pemasangan gaya WAJIB yang menerima foto (input_references); model :free yang hanya teks-ke-gambar tidak bisa dipakai.
 * Daftar model yang mendukung edit: GET https://openrouter.ai/api/v1/images/models
 */
/** Model vision gratis di OpenRouter untuk analisa wajah, dicoba berurutan. Daftar bisa berubah; ganti lewat TRYON_ANALYSIS_MODEL. */
const OPENROUTER_FREE_VISION = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'nvidia/nemotron-3.5-super-vl:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free']

function createOpenRouterProvider({
  apiKey,
  model = 'bytedance-seed/seedream-4.5',
  // Satu atau beberapa model (dipisah koma), dicoba berurutan. Model :free sering penuh (429), jadi daftar cadangan penting.
  analysisModel = OPENROUTER_FREE_VISION.join(','),
  timeoutMs = 120_000,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error('TRYON_API_KEY wajib diisi.')
  // Model gratis sering lambat; per model dibatasi supaya yang macet cepat dilewati dan pengguna tidak menunggu semenit lebih.
  const analysisTimeoutMs = Math.min(timeoutMs, 25_000)
  const analysisModels = String(analysisModel).split(',').map((item) => item.trim()).filter(Boolean)
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'x-title': 'Pit Stop Barbershop' }
  const reference = ({ mimeType, base64 }) => ({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } })
  return {
    name: 'openrouter',
    async generate({ photo, reference: styleImage, haircutName }) {
      const response = await fetchImpl(`${OPENROUTER_BASE}/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          prompt: buildPrompt(haircutName),
          // Urutan penting: gambar 1 = foto pelanggan, gambar 2 = referensi gaya (sesuai prompt).
          input_references: [reference(photo), reference(styleImage)],
          response_format: 'b64_json',
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`OpenRouter menolak permintaan (${response.status}): ${await readError(response)}`)
      const data = await response.json()
      const item = data?.data?.[0]
      if (item?.b64_json) return { mimeType: item.media_type ?? 'image/png', base64: item.b64_json }
      if (item?.url) {
        // Cadangan bila penyedia mengembalikan tautan (berlaku 24 jam) alih-alih base64.
        const download = await fetchImpl(item.url, { signal: AbortSignal.timeout(timeoutMs) })
        if (!download.ok) throw new Error(`OpenRouter: gambar hasil tidak bisa diunduh (${download.status}).`)
        return { mimeType: download.headers.get('content-type') ?? 'image/png', base64: Buffer.from(await download.arrayBuffer()).toString('base64') }
      }
      throw new Error('OpenRouter tidak mengembalikan gambar.')
    },
    async analyze({ photo, haircuts }) {
      // Model yang penuh (429), sedang error (5xx), atau sudah dihapus (404) dilewati; kegagalan lain (mis. 401, 402) langsung dilaporkan.
      const skippable = new Set([404, 408, 429, 500, 502, 503, 504])
      const failures = []
      for (const name of analysisModels) {
        let response
        try {
          response = await fetchImpl(`${OPENROUTER_BASE}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: name,
              messages: [{ role: 'user', content: [{ type: 'text', text: buildAnalysisPrompt(haircuts) }, reference(photo)] }],
            }),
            signal: AbortSignal.timeout(analysisTimeoutMs),
          })
        } catch (error) {
          failures.push(`${name}: ${error.message}`)
          continue
        }
        if (!response.ok) {
          const detail = `${name}: ${response.status} ${await readError(response)}`
          if (skippable.has(response.status)) {
            failures.push(detail)
            continue
          }
          throw new Error(`OpenRouter menolak analisa (${detail})`)
        }
        const data = await response.json()
        const text = data?.choices?.[0]?.message?.content
        if (!text) {
          failures.push(`${name}: jawaban kosong`)
          continue
        }
        try {
          return parseAnalysis(text, haircuts)
        } catch (error) {
          failures.push(`${name}: ${error.message}`)
        }
      }
      throw new Error(`OpenRouter: semua model analisa gagal (${failures.join(' | ')})`)
    },
  }
}

/**
 * Memilih penyedia dari environment. Mengembalikan null kalau token belum diisi: fitur AI dianggap belum aktif
 * (web menampilkan pesan "belum aktif", bukan hasil palsu).
 *   TRYON_API_KEY  : token penyedia (rahasia)
 *   TRYON_PROVIDER : gemini (bawaan) | openai
 *   TRYON_MODEL / TRYON_ANALYSIS_MODEL : opsional, mengganti model gambar / model analisa bawaan penyedia
 */
function createTryOnProviderFromEnv(env = process.env) {
  const apiKey = (env.TRYON_API_KEY || '').trim()
  if (!apiKey) return null
  const name = (env.TRYON_PROVIDER || 'gemini').toLowerCase()
  const model = env.TRYON_MODEL || undefined
  const analysisModel = env.TRYON_ANALYSIS_MODEL || undefined
  if (name === 'gemini') return createGeminiProvider({ apiKey, model, analysisModel })
  if (name === 'openai') return createOpenAiProvider({ apiKey, model, analysisModel })
  if (name === 'openrouter') return createOpenRouterProvider({ apiKey, model, analysisModel })
  throw new Error(`TRYON_PROVIDER tidak dikenal: "${name}". Pilih gemini, openai, atau openrouter.`)
}

module.exports = { buildPrompt, buildAnalysisPrompt, parseAnalysis, createGeminiProvider, createOpenAiProvider, createOpenRouterProvider, createTryOnProviderFromEnv }
