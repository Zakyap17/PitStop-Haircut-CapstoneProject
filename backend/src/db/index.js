/**
 * Lapisan database tipis supaya kode lain tidak peduli driver-nya.
 *  - Ada DATABASE_URL  -> PostgreSQL sungguhan lewat `pg` (Supabase, Neon, dll.).
 *  - Tanpa DATABASE_URL -> PGlite, PostgreSQL yang jalan di dalam proses Node, untuk dev dan tes.
 *    Data disimpan di PGLITE_DIR bila diisi, kalau tidak hilang saat server berhenti.
 *
 * Antarmuka yang dipakai kode lain:
 *   db.query(text, params) -> { rows }
 *   db.exec(sql)           -> menjalankan banyak perintah sekaligus (migrasi)
 *   db.transaction(fn)     -> fn(client) dengan client.query / client.exec; commit bila sukses, rollback bila gagal
 *   db.close()
 */
async function createPostgresDb(connectionString) {
  const { Pool } = require('pg')
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Pooler Supabase memutus koneksi yang nganggur dan jaringan laptop bisa putus sebentar. Keepalive mengurangi putusnya,
    // dan koneksi yang tetap putus dibuang dari pool lalu diganti saat dibutuhkan lagi.
    keepAlive: true,
    idleTimeoutMillis: 30_000,
  })
  // Tanpa penangan ini, error pada koneksi nganggur (mis. ECONNRESET) tidak tertangkap dan mematikan seluruh backend.
  pool.on('error', (error) => console.error(`[db] koneksi nganggur terputus (${error.code ?? error.message}); akan dibuka ulang saat dibutuhkan.`))

  const wrap = (client) => ({
    query: (text, params) => client.query(text, params),
    exec: (sql) => client.query(sql),
  })

  return {
    driver: 'pg',
    ...wrap(pool),
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn(wrap(client))
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        throw error
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
}

async function createPgliteDb(dataDir) {
  const { PGlite } = require('@electric-sql/pglite')
  const pg = dataDir ? new PGlite(dataDir) : new PGlite()
  await pg.waitReady

  const wrap = (client) => ({
    query: (text, params) => client.query(text, params),
    exec: (sql) => client.exec(sql),
  })

  return {
    driver: 'pglite',
    ...wrap(pg),
    transaction: (fn) => pg.transaction((tx) => fn(wrap(tx))),
    close: () => pg.close(),
  }
}

async function createDb(options = {}) {
  const url = options.databaseUrl ?? process.env.DATABASE_URL
  if (url) return createPostgresDb(url)

  if (process.env.NODE_ENV === 'production' && !options.allowEmbedded) {
    throw new Error('DATABASE_URL wajib diisi saat NODE_ENV=production.')
  }
  return createPgliteDb(options.dataDir ?? process.env.PGLITE_DIR)
}

module.exports = { createDb }
