const express = require('express')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')
const { badRequest } = require('../lib/errors')
const { requestOtp } = require('../services/otp')

const schema = z
  .object({
    phone: z.string().trim().min(8).max(30),
    customerName: z.string().trim().min(2).max(100).optional(),
    // booking (bawaan): kode untuk membuat booking. history: kode untuk melihat riwayat, hanya dikirim ke nomor yang pernah memesan.
    purpose: z.enum(['booking', 'history']).default('booking'),
  })
  .refine((value) => value.purpose === 'history' || Boolean(value.customerName), { path: ['customerName'] })

/**
 * Verifikasi OTP WhatsApp sebelum booking. POST /api/otp/request mengirim kode 6 digit ke nomor itu. Kodenya diperiksa saat
 * POST /api/reservations (field otpCode), bukan di sini, supaya satu kode hanya bisa dipakai untuk satu booking.
 * Batas per nomor (jeda 60 detik, 3 kali per 10 menit) ada di service; batas per alamat IP di sini.
 */
function otpRouter(ctx) {
  const router = express.Router()
  const limit = ctx.limits?.otp ?? 20
  const ipLimit = rateLimit({
    windowMs: 10 * 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Terlalu banyak permintaan kode. Tunggu beberapa menit lalu coba lagi.' } }),
  })

  router.post('/otp/request', ipLimit, async (req, res) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw badRequest('invalid_input', 'Isi nama dan nomor WhatsApp dengan benar.')
    const result = await requestOtp(ctx, parsed.data)
    res.set('Cache-Control', 'no-store')
    res.json(result)
  })

  return router
}

module.exports = { otpRouter }
