const express = require('express')
const { internalRouter, internalPool } = require('./router')

/**
 * Server khusus web internal (Admin, Capster, Owner): hanya rute /api/internal, tanpa rute customer, OTP, atau worker WhatsApp.
 * Dijalankan sebagai container sendiri (SERVICE=internal) supaya gangguan di sini tidak menjatuhkan reservasi pelanggan, dan sebaliknya.
 */
function createInternalApp({ trustProxy } = {}) {
  const app = express()
  if (trustProxy) app.set('trust proxy', trustProxy === 'true' ? true : /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy)
  app.disable('x-powered-by')
  app.use(internalRouter)
  // Format galat sama dengan rute internal lain: { error: "pesan" }.
  app.use((req, res) => res.status(404).json({ error: 'Alamat API tidak ditemukan.' }))
  return app
}

function startInternalServer({ port, host }) {
  const app = createInternalApp({ trustProxy: process.env.TRUST_PROXY })
  const server = app.listen(port, host, () => {
    console.log(`PitStop API internal berjalan di http://${host}:${port}`)
    if (!process.env.JWT_SECRET) console.warn('JWT_SECRET kosong: login internal akan membalas 503.')
    if (!internalPool) console.warn('DATABASE_URL kosong: rute internal akan membalas 503.')
  })
  const shutdown = () => {
    server.close(() => Promise.allSettled([internalPool ? internalPool.end() : null]).finally(() => process.exit(0)))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  return server
}

module.exports = { createInternalApp, startInternalServer }
