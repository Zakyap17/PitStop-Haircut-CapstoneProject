const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const { DATABASE_URL, BOOTSTRAP_OWNER_NAME, BOOTSTRAP_OWNER_EMAIL, BOOTSTRAP_OWNER_PASSWORD, DATABASE_SSL } = process.env;
  if (!DATABASE_URL || !BOOTSTRAP_OWNER_NAME || !BOOTSTRAP_OWNER_EMAIL || !BOOTSTRAP_OWNER_PASSWORD) {
    throw new Error('Atur DATABASE_URL, BOOTSTRAP_OWNER_NAME, BOOTSTRAP_OWNER_EMAIL, dan BOOTSTRAP_OWNER_PASSWORD di backend/.env.');
  }
  if (BOOTSTRAP_OWNER_PASSWORD.length < 12) throw new Error('BOOTSTRAP_OWNER_PASSWORD minimal 12 karakter.');
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  try {
    const hash = await bcrypt.hash(BOOTSTRAP_OWNER_PASSWORD, 12);
    const result = await pool.query(
      `INSERT INTO pengguna(nama_lengkap,email,password_hash,role,status_aktif)
       VALUES($1,$2,$3,'owner',true) ON CONFLICT(email) DO NOTHING RETURNING id_pengguna`,
      [BOOTSTRAP_OWNER_NAME.trim(), BOOTSTRAP_OWNER_EMAIL.trim().toLowerCase(), hash]);
    console.log(result.rowCount ? 'Akun owner awal berhasil dibuat.' : 'Email tersebut sudah terdaftar; tidak ada perubahan.');
  } finally { await pool.end(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
