require('dotenv').config()

const { createApp } = require('./app')
const { createDb } = require('./db')
const { runMigrations } = require('./db/migrate')

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'

async function main() {
  const db = await createDb()
  // Migrasi dijalankan otomatis saat start; aman diulang karena yang sudah jalan dilewati.
  const applied = await runMigrations(db, { log: console.log })
  if (applied.length) console.log(`${applied.length} migrasi baru dijalankan.`)

  const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()) : '*'
  // Batas percobaan per alamat IP. Bawaan: 30 pembuatan reservasi per menit dan 100 cek/ubah/batal per 15 menit.
  const limits = {}
  if (process.env.RATE_LIMIT_WRITE) limits.write = Number(process.env.RATE_LIMIT_WRITE)
  if (process.env.RATE_LIMIT_ACCESS) limits.access = Number(process.env.RATE_LIMIT_ACCESS)
  const app = createApp({ db, corsOrigins, trustProxy: process.env.TRUST_PROXY, limits })

  const server = app.listen(PORT, HOST, () => {
    console.log(`PitStop backend berjalan di http://${HOST}:${PORT} (database: ${db.driver})`)
    if (db.driver === 'pglite') console.log('Memakai database tertanam (PGlite). Isi DATABASE_URL di .env untuk PostgreSQL sungguhan.')
  })

  const shutdown = () => server.close(() => db.close().finally(() => process.exit(0)))
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('Backend gagal start:', error.message)
  process.exit(1)
})
