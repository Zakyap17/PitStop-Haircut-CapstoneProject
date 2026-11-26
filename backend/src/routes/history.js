const express = require('express')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')
const { badRequest } = require('../lib/errors')
const { loadHistory } = require('../services/history')

const schema = z.object({
  phone: z.string().trim().min(8).max(30),
  otpCode: z.string().trim().regex(/^\d{6}$/),
})

/**
 * Riwayat booking per nomor WhatsApp. Kodenya diminta lewat POST /api/otp/request dengan purpose "history", lalu dikirim ke sini.
 * Selalu wajib OTP, termasuk saat OTP_REQUIRED=false (itu hanya untuk pembuatan booking): nomor saja tidak boleh cukup untuk membuka riwayat.
 */
function historyRouter(ctx) {
  const router = express.Router()
  const limit = rateLimit({
    windowMs: 15 * 60_000,
    limit: ctx.limits?.access ?? 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.' } }),
  })

  // POST, bukan GET, supaya nomor dan kode tidak tercatat di URL dan log server.
  router.post('/history', limit, async (req, res) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw badRequest('invalid_input', 'Isi nomor WhatsApp dan kode 6 digit dengan benar.')
    res.set('Cache-Control', 'no-store')
    res.json(await loadHistory(ctx, parsed.data))
  })

  return router
}

module.exports = { historyRouter }
