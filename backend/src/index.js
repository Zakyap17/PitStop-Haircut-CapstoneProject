require('dotenv').config()

const { createApp } = require('./app')
const { createDb } = require('./db')
const { pendingMigrations, runMigrations } = require('./db/migrate')
const { createProviderFromEnv } = require('./notifications/providers')
const { startNotificationWorker } = require('./notifications/worker')
const { createTryOnProviderFromEnv } = require('./tryon/providers')

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'

async function main() {
  const db = await createDb()
  // Migrasi otomatis hanya untuk database tertanam (dev/tes). Di database bersama (Supabase/VM) migrasi yang mengubah
  // struktur harus dijalankan sengaja: `npm run migrate`, atau isi AUTO_MIGRATE=true kalau memang mau otomatis.
  // Tanpa ini, siapa pun yang menyalakan backend dengan .env database bersama bisa tanpa sengaja menjalankan migrasi.
  const autoMigrate = db.driver === 'pglite' || process.env.AUTO_MIGRATE === 'true'
  if (autoMigrate) {
    const applied = await runMigrations(db, { log: console.log })
    if (applied.length) console.log(`${applied.length} migrasi baru dijalankan.`)
  } else {
    const pending = await pendingMigrations(db)
    if (pending.length) {
      console.error(`Ada ${pending.length} migrasi belum dijalankan: ${pending.join(', ')}. Jalankan "npm run migrate" lebih dulu, lalu nyalakan backend lagi.`)
      process.exit(1)
    }
  }

  const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()) : '*'
  // Batas percobaan per alamat IP. Bawaan: 30 pembuatan reservasi per menit dan 100 cek/ubah/batal per 15 menit.
  const limits = {}
  if (process.env.RATE_LIMIT_WRITE) limits.write = Number(process.env.RATE_LIMIT_WRITE)
  if (process.env.RATE_LIMIT_ACCESS) limits.access = Number(process.env.RATE_LIMIT_ACCESS)
  // Alamat publik web customer, dipakai untuk tautan di pesan WhatsApp (contoh https://pitstop.example.com).
  const webUrl = process.env.PUBLIC_WEB_URL || undefined
  if (process.env.TRYON_RATE_LIMIT) limits.tryOn = Number(process.env.TRYON_RATE_LIMIT)
  // Virtual Try-On AI: aktif kalau TRYON_API_KEY terisi. Tanpa itu, web menampilkan fitur ini sebagai belum aktif.
  const tryOnProvider = createTryOnProviderFromEnv()
  // TRYON_GENERATE_IMAGE=false = mode analisa saja: AI hanya menganalisa wajah dan merekomendasikan gaya (gratis dengan model :free),
  // tanpa memasang gaya di foto (butuh model gambar berbayar).
  const tryOnGenerate = process.env.TRYON_GENERATE_IMAGE !== 'false'
  console.log(tryOnProvider ? `Try-on AI: penyedia ${tryOnProvider.name}, ${tryOnGenerate ? 'analisa + pasang gaya di foto' : 'mode analisa saja'}` : 'Try-on AI: belum aktif (isi TRYON_API_KEY di .env).')
  const app = createApp({ db, corsOrigins, trustProxy: process.env.TRUST_PROXY, limits, webUrl, tryOnProvider, tryOnGenerate })

  // Pengiriman WhatsApp: pesan masuk antrean saat reservasi berubah, worker ini yang mengirimnya.
  const provider = createProviderFromEnv()
  console.log(`WhatsApp: penyedia ${provider.name}${provider.name === 'console' ? ' (pesan hanya dicetak di log, tidak dikirim)' : ''}`)
  if (!webUrl) console.warn('PUBLIC_WEB_URL kosong: pesan WhatsApp tidak akan memuat tautan cek/ubah reservasi.')
  const stopWorker = startNotificationWorker({ db, provider, webUrl })

  const server = app.listen(PORT, HOST, () => {
    console.log(`PitStop backend berjalan di http://${HOST}:${PORT} (database: ${db.driver})`)
    if (db.driver === 'pglite') console.log('Memakai database tertanam (PGlite). Isi DATABASE_URL di .env untuk PostgreSQL sungguhan.')
  })

  const shutdown = () => {
    stopWorker()
    server.close(() => db.close().finally(() => process.exit(0)))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('Backend gagal start:', error.message)
  process.exit(1)
})
