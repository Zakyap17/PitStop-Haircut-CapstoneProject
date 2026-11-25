const cors = require('cors')
const express = require('express')
const { HttpError } = require('./lib/errors')
const { catalogRouter } = require('./routes/catalog')
const { reservationsRouter } = require('./routes/reservations')

/**
 * Membuat aplikasi Express. Dipisah dari index.js supaya tes bisa membuatnya dengan database dan jam palsu.
 * @param {{ db: object, clock?: () => Date, corsOrigins?: string[] | '*', trustProxy?: string, limits?: { write?: number, access?: number } }} options
 */
function createApp({ db, clock = () => new Date(), corsOrigins = '*', trustProxy, limits, webUrl } = {}) {
  const app = express()
  if (trustProxy) app.set('trust proxy', trustProxy === 'true' ? true : /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy)
  app.disable('x-powered-by')

  app.use(cors({ origin: corsOrigins === '*' ? true : corsOrigins }))
  app.use(express.json({ limit: '20kb' }))

  const ctx = { db, clock, limits, webUrl }
  app.get('/api/health', async (req, res) => {
    await db.query('SELECT 1')
    res.json({ status: 'ok', service: 'pitstop-backend', database: db.driver })
  })
  app.use('/api', catalogRouter(ctx))
  app.use('/api', reservationsRouter(ctx))

  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Alamat API tidak ditemukan.' } }))

  // Penanganan error terakhir. Detail error internal hanya masuk log, tidak dikirim ke klien.
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: { code: error.code, message: error.message } })
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'invalid_json', message: 'Isi permintaan bukan JSON yang valid.' } })
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'too_large', message: 'Permintaan terlalu besar.' } })
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error)
    res.status(500).json({ error: { code: 'server_error', message: 'Terjadi kesalahan di server. Coba lagi sebentar lagi.' } })
  })

  return app
}

module.exports = { createApp }
