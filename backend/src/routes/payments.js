const express = require('express')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')
const { badRequest } = require('../lib/errors')
const { handleNotification, paymentConfig, startOnlinePayment, syncPayment } = require('../services/payments')

const phone = z.string().trim().min(8).max(30)
const schemas = { access: z.object({ phone }) }

function parse(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  throw badRequest('invalid_input', 'Data tidak valid.')
}

function limiter(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.' } }),
  })
}

/** Pembayaran DP online. ctx.midtrans kosong = fitur nonaktif (config.online = false, rute bayar membalas 503). */
function paymentsRouter(ctx) {
  const router = express.Router()
  const limits = { access: 100, ...ctx.limits }
  const accessLimit = limiter(15 * 60_000, limits.access)
  // Webhook dipanggil server Midtrans, bukan pelanggan, jadi batasnya longgar dan tidak per pelanggan.
  const webhookLimit = limiter(60_000, 600)

  router.get('/payments/config', (req, res) => res.json(paymentConfig(ctx)))

  router.post('/reservations/:code/pay', accessLimit, async (req, res) => {
    const { phone: customerPhone } = parse(schemas.access, req.body)
    res.status(201).json(await startOnlinePayment(ctx, { code: req.params.code, phone: customerPhone }))
  })

  router.post('/reservations/:code/pay/sync', accessLimit, async (req, res) => {
    const { phone: customerPhone } = parse(schemas.access, req.body)
    res.json(await syncPayment(ctx, { code: req.params.code, phone: customerPhone }))
  })

  // Alamat ini didaftarkan di dashboard Midtrans (Settings > Configuration > Payment Notification URL).
  router.post('/payments/midtrans/notification', webhookLimit, async (req, res) => {
    const outcome = await handleNotification(ctx, req.body)
    res.json({ ok: true, result: outcome.result })
  })

  return router
}

module.exports = { paymentsRouter }
