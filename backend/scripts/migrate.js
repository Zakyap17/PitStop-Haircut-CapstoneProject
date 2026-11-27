const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = path.join(__dirname, '..', 'db', 'migrations');
    for (const name of fs.readdirSync(directory).filter((item) => item.endsWith('.sql')).sort()) {
      const existing = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
      if (existing.rowCount) { console.log(`skip ${name}`); continue; }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(fs.readFileSync(path.join(directory, name), 'utf8'));
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
        await client.query('COMMIT');
        console.log(`applied ${name}`);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
  } finally { await pool.end(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
