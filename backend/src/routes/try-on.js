const express = require('express')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')
const { HttpError, badRequest } = require('../lib/errors')
const { loadHaircuts } = require('./catalog')

/** Foto pelanggan dan foto referensi dikirim sebagai JSON base64, sudah diperkecil oleh browser (sekitar 1 MB). */
const BODY_LIMIT = '8mb'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MIME = /^image\/(jpeg|png|webp)$/

const image = z.object({
  mimeType: z.string().regex(MIME),
  base64: z.string().min(100).max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16).regex(/^[A-Za-z0-9+/]+={0,2}$/),
})
const analyzeSchema = z.object({ photo: image })
const bodySchema = z.object({
  photo: image,
  reference: image,
  haircutName: z.string().trim().min(1).max(80),
})

/**
 * Virtual Try-On berbasis AI. Browser mengirim foto pelanggan dan foto referensi gaya rambut, backend meneruskannya
 * ke penyedia AI dengan token dari .env, lalu mengembalikan foto hasilnya. Foto tidak disimpan di server maupun database.
 */
function tryOnRouter({ db, tryOnProvider, canGenerate = true, limits }) {
  const router = express.Router()
  const limit = limits?.tryOn ?? 30

  router.get('/try-on/status', (req, res) => {
    // enabled = analisa wajah tersedia; canGenerate = pemasangan gaya di foto (berbayar) juga dinyalakan.
    res.json({ enabled: Boolean(tryOnProvider), canGenerate: Boolean(tryOnProvider) && canGenerate })
  })

  // Satu pembatas untuk analisa dan pembuatan gambar: keduanya memakai kuota berbayar.
  const guard = [
    express.json({ limit: BODY_LIMIT }),
    rateLimit({
      windowMs: 10 * 60_000,
      limit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Terlalu banyak percobaan try-on. Tunggu beberapa menit lalu coba lagi.' } }),
    }),
  ]

  /** Memanggil penyedia AI; detail kegagalannya (bisa memuat info akun) hanya untuk log. */
  async function callProvider(action, input) {
    if (!tryOnProvider) throw new HttpError(503, 'tryon_disabled', 'Try-on AI belum diaktifkan.')
    try {
      return await tryOnProvider[action](input)
    } catch (error) {
      console.error(`[try-on] ${tryOnProvider.name} ${action} gagal: ${error.message}`)
      throw new HttpError(502, 'tryon_failed', 'AI belum berhasil memproses fotomu. Coba lagi, atau pakai foto lain.')
    }
  }

  // Langkah 1: AI menilai wajah di foto dan memilih gaya dari galeri toko yang cocok.
  router.post('/try-on/analyze', ...guard, async (req, res) => {
    const parsed = analyzeSchema.safeParse(req.body)
    if (!parsed.success) throw badRequest('invalid_input', 'Foto tidak valid. Gunakan foto JPG, PNG, atau WebP yang lebih kecil.')
    const haircuts = await loadHaircuts(db)
    const analysis = await callProvider('analyze', { photo: parsed.data.photo, haircuts })
    if (!analysis.faceDetected) throw new HttpError(422, 'no_face', 'Wajah tidak terdeteksi. Pakai foto yang menghadap depan dengan cahaya cukup.')
    res.set('Cache-Control', 'no-store')
    res.json({ faceShape: analysis.faceShape, hairType: analysis.hairType, summary: analysis.summary, recommendedIds: analysis.recommendedIds })
  })

  // Langkah 2: AI memasang gaya yang dipilih di foto pelanggan.
  router.post('/try-on', ...guard, async (req, res) => {
    if (!canGenerate) throw new HttpError(503, 'tryon_generate_disabled', 'Pemasangan gaya di foto belum diaktifkan.')
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) throw badRequest('invalid_input', 'Foto tidak valid. Gunakan foto JPG, PNG, atau WebP yang lebih kecil.')
    const result = await callProvider('generate', parsed.data)
    res.set('Cache-Control', 'no-store')
    res.json({ image: `data:${result.mimeType};base64,${result.base64}` })
  })

  return router
}

module.exports = { tryOnRouter }
