const express = require('express')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')
const { badRequest } = require('../lib/errors')
const { getAvailability } = require('../services/availability')
const { loadSettings } = require('../services/settings')
const { cancelReservation, createReservation, lookupReservation, rescheduleReservation } = require('../services/reservations')

const text = (max) => z.string().trim().min(1).max(max)
const email = z.string().trim().toLowerCase().email().max(120)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

const schemas = {
  availability: z.object({ date: isoDate, serviceId: text(60) }),
  create: z.object({
    serviceId: text(60),
    barberId: text(60),
    date: isoDate,
    time: hhmm,
    customerName: z.string().trim().min(2).max(100),
    customerEmail: email,
    customerPhone: z.string().trim().min(8).max(30),
    hairstyle: z.string().trim().max(80).optional(),
  }),
  lookup: z.object({ code: text(20), email }),
  reschedule: z.object({ email, barberId: text(60), date: isoDate, time: hhmm }),
  cancel: z.object({ email }),
}

/** Mengubah hasil validasi zod yang gagal menjadi pesan 400 yang ramah (dalam bahasa Indonesia). */
function parse(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')).filter(Boolean))]
  throw badRequest('invalid_input', fields.length ? `Data tidak valid: ${fields.join(', ')}.` : 'Data tidak valid.')
}

function limiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message } }),
  })
}

function reservationsRouter(ctx) {
  const router = express.Router()
  const tooMany = 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'
  const limits = { write: 30, access: 100, ...ctx.limits }
  const writeLimit = limiter(60_000, limits.write, tooMany)
  const accessLimit = limiter(15 * 60_000, limits.access, tooMany)

  router.get('/availability', async (req, res) => {
    const query = parse(schemas.availability, req.query)
    const settings = await loadSettings(ctx.db)
    res.json(await getAvailability({ db: ctx.db, settings, clock: ctx.clock }, query))
  })

  router.post('/reservations', writeLimit, async (req, res) => {
    const reservation = await createReservation(ctx, parse(schemas.create, req.body))
    res.status(201).json({ reservation })
  })

  // POST, bukan GET, supaya email tidak tercatat di URL dan log server.
  router.post('/reservations/lookup', accessLimit, async (req, res) => {
    res.json({ reservation: await lookupReservation(ctx, parse(schemas.lookup, req.body)) })
  })

  router.post('/reservations/:code/reschedule', accessLimit, async (req, res) => {
    const body = parse(schemas.reschedule, req.body)
    res.json({ reservation: await rescheduleReservation(ctx, { code: req.params.code, ...body }) })
  })

  router.post('/reservations/:code/cancel', accessLimit, async (req, res) => {
    const body = parse(schemas.cancel, req.body)
    res.json({ reservation: await cancelReservation(ctx, { code: req.params.code, email: body.email }) })
  })

  return router
}

module.exports = { reservationsRouter }
