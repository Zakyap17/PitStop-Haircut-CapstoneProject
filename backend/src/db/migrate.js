/**
 * Menjalankan file di folder migrations/ yang belum pernah dijalankan, berurutan menurut nama file.
 * Jalankan: npm run migrate   (memakai DATABASE_URL dari .env)
 */
const fs = require('node:fs')
const path = require('node:path')

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations')

async function runMigrations(db, { log = () => {} } = {}) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((row) => row.name))

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  const applied = []
  for (const file of files) {
    if (done.has(file)) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    await db.transaction(async (tx) => {
      await tx.exec(sql)
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    })
    log(`migrasi dijalankan: ${file}`)
    applied.push(file)
  }
  return applied
}

/** Nama file migrasi yang belum pernah dijalankan di database ini (tanpa menjalankannya). */
async function pendingMigrations(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((row) => row.name))
  return fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql') && !done.has(file)).sort()
}

module.exports = { runMigrations, pendingMigrations }

if (require.main === module) {
  require('dotenv').config()
  const { createDb } = require('./index')
  ;(async () => {
    const db = await createDb()
    try {
      const applied = await runMigrations(db, { log: console.log })
      console.log(applied.length === 0 ? 'Database sudah yang terbaru.' : `Selesai: ${applied.length} migrasi.`)
    } finally {
      await db.close()
    }
  })().catch((error) => {
    console.error('Migrasi gagal:', error.message)
    process.exit(1)
  })
}
