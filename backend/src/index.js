const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const COOKIE_NAME = 'pitstop_internal_session';
const JWT_SECRET = process.env.JWT_SECRET;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',').map((item) => item.trim());
const loginFailures = new Map();
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined })
  : null;
const roles = ['owner', 'admin', 'capster'];

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/internal', (req,res,next) => {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin=req.get('origin');
  if (origin && !allowedOrigins.includes(origin)) return fail(res,403,'Origin tidak diizinkan.');
  next();
});

function fail(res, status, message) { return res.status(status).json({ error: message }); }
function requireDb(req, res, next) {
  if (!pool) return fail(res, 503, 'Database belum dikonfigurasi. Atur DATABASE_URL pada backend/.env.');
  next();
}
function requireSecret(req, res, next) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) return fail(res, 503, 'JWT_SECRET harus diatur dengan minimal 32 karakter.');
  next();
}
function auth(requiredRoles = roles) {
  return async (req, res, next) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token || !JWT_SECRET) return fail(res, 401, 'Silakan login terlebih dahulu.');
    try {
      const claims = jwt.verify(token, JWT_SECRET);
      if (!requiredRoles.includes(claims.role)) return fail(res, 403, 'Akses tidak diizinkan untuk role ini.');
      if (!pool) return fail(res,503,'Database belum dikonfigurasi.');
      const {rows}=await pool.query('SELECT u.id_pengguna,u.nama_lengkap,u.email,u.role,u.status_aktif,c.id_capster,c.status_aktif AS capster_aktif FROM pengguna u LEFT JOIN capster c ON c.id_pengguna=u.id_pengguna WHERE u.id_pengguna=$1',[Number(claims.sub)]);
      const active=rows[0];
      if (!active || !active.status_aktif || !requiredRoles.includes(active.role)) return fail(res,401,'Akun tidak aktif atau sesi sudah tidak berlaku.');
      if (active.role==='capster' && !active.id_capster) return fail(res,403,'Profil capster belum tersedia.');
      if (active.role==='capster' && !active.capster_aktif) return fail(res,401,'Akun capster tidak aktif.');
      req.user = { id: Number(active.id_pengguna), name: active.nama_lengkap, email: active.email, role: active.role, capsterId: active.id_capster || null };
      next();
    } catch (error) {
      if (error?.name==='JsonWebTokenError' || error?.name==='TokenExpiredError') return fail(res,401,'Sesi login tidak valid atau sudah kedaluwarsa.');
      console.error(error);
      return fail(res,503,'Sesi belum dapat diverifikasi.');
    }
  };
}
const ownerOnly = auth(['owner']);
const adminOwner = auth(['owner', 'admin']);
const capsterOnly = auth(['capster']);
const allInternal = auth();
const cookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax', path: '/', maxAge: 8 * 60 * 60 * 1000 });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const money = (value) => Number(value || 0);
const dateToday = "(now() AT TIME ZONE 'Asia/Jakarta')::date";
async function audit(userId, action, objectType, objectId, db = pool) {
  await db.query('INSERT INTO jejak_audit(id_pengguna,waktu,aksi,jenis_objek,id_objek) VALUES($1,now(),$2,$3,$4)', [userId || null, action, objectType, objectId || null]);
}

app.get('/api/health', asyncRoute(async (req, res) => {
  let database = 'not_configured';
  if (pool) {
    try { await pool.query('SELECT 1'); database = 'connected'; }
    catch { database = 'unavailable'; }
  }
  res.status(database === 'unavailable' ? 503 : 200).json({ status: database === 'connected' ? 'ok' : 'degraded', service: 'pitstop-backend', database });
}));

// Authentication for internal users only. Customer routes are intentionally not defined here.
app.post('/api/internal/auth/login', requireDb, requireSecret, asyncRoute(async (req, res) => {
  const ip=req.ip || req.socket.remoteAddress || 'unknown'; const attempt=loginFailures.get(ip) || {count:0,until:0};
  if (attempt.until>Date.now() && attempt.count>=8) return fail(res,429,'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.');
  if (attempt.until<=Date.now()) { attempt.count=0; attempt.until=Date.now()+15*60*1000; }
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return fail(res, 400, 'Email dan password wajib diisi.');
  const { rows } = await pool.query(
    `SELECT u.id_pengguna, u.nama_lengkap, u.email, u.password_hash, u.role, u.status_aktif,
            c.id_capster,c.status_aktif AS capster_aktif
       FROM pengguna u LEFT JOIN capster c ON c.id_pengguna = u.id_pengguna
      WHERE lower(u.email) = $1 LIMIT 1`, [email]);
  const user = rows[0];
  if (!user || !user.status_aktif || !roles.includes(user.role) || (user.role==='capster'&&!user.capster_aktif) || !(await bcrypt.compare(password, user.password_hash))) {
    attempt.count+=1; loginFailures.set(ip,attempt);
    return fail(res, 401, 'Email atau password salah.');
  }
  loginFailures.delete(ip);
  const token = jwt.sign({ sub: user.id_pengguna, name: user.nama_lengkap, email: user.email, role: user.role, capsterId: user.id_capster }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  await audit(user.id_pengguna, 'login', 'pengguna', user.id_pengguna);
  res.json({ user: { id: user.id_pengguna, name: user.nama_lengkap, email: user.email, role: user.role, capsterId: user.id_capster } });
}));
app.post('/api/internal/auth/logout', (req, res) => { res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined }); res.json({ ok: true }); });
app.get('/api/internal/auth/me', requireDb, allInternal, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id_pengguna, nama_lengkap, email, role, status_aktif FROM pengguna WHERE id_pengguna = $1', [req.user.id]);
  if (!rows[0]?.status_aktif) { res.clearCookie(COOKIE_NAME, cookieOptions()); return fail(res, 401, 'Akun tidak aktif.'); }
  res.json({ user: { id: rows[0].id_pengguna, name: rows[0].nama_lengkap, email: rows[0].email, role: rows[0].role, capsterId: req.user.capsterId } });
}));

// Role-aware dashboard data.
app.get('/api/internal/dashboard', requireDb, allInternal, asyncRoute(async (req, res) => {
  if (req.user.role === 'capster') {
    const { rows } = await pool.query(
      `WITH served AS (
         SELECT b.tanggal_booking AS service_date FROM riwayat_layanan rl JOIN booking b ON b.id_booking=rl.id_booking
          WHERE rl.id_capster=$1 AND rl.status_layanan='layanan selesai'
         UNION ALL SELECT created_at::date FROM transaksi WHERE id_capster=$1 AND status_layanan='selesai'
       ) SELECT (SELECT count(*) FROM booking WHERE id_capster=$1 AND tanggal_booking=${dateToday})::int AS today_count,
                (SELECT count(*) FROM served WHERE service_date=${dateToday})::int AS completed_count,
                100000 + (SELECT count(*) FROM served WHERE service_date=${dateToday}) * 10000 AS earnings`, [req.user.capsterId]);
    const schedule = await pool.query(
      `SELECT b.id_booking, b.kode_booking, b.tanggal_booking, b.jam_mulai, b.jam_selesai, b.status_booking,
              c.nama_customer, string_agg(l.nama_layanan, ', ' ORDER BY l.nama_layanan) AS layanan
         FROM booking b JOIN customer c ON c.id_customer=b.id_customer
         LEFT JOIN booking_layanan bl ON bl.id_booking=b.id_booking LEFT JOIN layanan l ON l.id_layanan=bl.id_layanan
        WHERE b.id_capster=$1 AND b.tanggal_booking >= ${dateToday} AND b.status_booking NOT IN ('dibatalkan','selesai','tidak_hadir')
          AND NOT EXISTS (SELECT 1 FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking AND rl.status_layanan='layanan selesai')
        GROUP BY b.id_booking,c.nama_customer ORDER BY b.tanggal_booking,b.jam_mulai LIMIT 8`, [req.user.capsterId]);
    const walkins = await pool.query(
      `SELECT NULL::bigint AS id_booking,t.id_transaksi,t.kode_transaksi AS kode_booking,t.created_at::date AS tanggal_booking,
              to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','HH24:MI')::time AS jam_mulai,
              t.status_layanan AS status_booking,c.nama_customer,
              string_agg(tl.nama_layanan_snapshot, ', ' ORDER BY tl.nama_layanan_snapshot) AS layanan
         FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN transaksi_layanan tl ON tl.id_transaksi=t.id_transaksi
        WHERE t.id_capster=$1 AND t.jenis_transaksi='walk-in' AND t.created_at::date=${dateToday} AND t.status_layanan <> 'selesai'
        GROUP BY t.id_transaksi,c.nama_customer ORDER BY t.created_at LIMIT 8`, [req.user.capsterId]);
    const todaySchedule = [...schedule.rows,...walkins.rows].sort((a,b)=>String(a.jam_mulai).localeCompare(String(b.jam_mulai))).slice(0,8);
    return res.json({ role: 'capster', metrics: rows[0], schedule: todaySchedule });
  }
  const base = await pool.query(
    `SELECT (SELECT count(*) FROM booking WHERE tanggal_booking=${dateToday} AND status_booking <> 'dibatalkan')::int AS bookings_today,
            (SELECT count(*) FROM transaksi WHERE created_at::date=${dateToday})::int AS transactions_today,
            (SELECT coalesce(sum(total_dibayar),0) FROM transaksi WHERE created_at::date=${dateToday}) AS revenue_today,
            (SELECT count(*) FROM booking WHERE status_booking IN ('menunggu_konfirmasi','menunggu konfirmasi'))::int AS awaiting_confirmation,
            (SELECT count(*) FROM customer) ::int AS customer_count`);
  const schedule = await pool.query(
    `SELECT b.id_booking,b.kode_booking,b.tanggal_booking,b.jam_mulai,b.jam_selesai,b.status_booking,c.nama_customer,
            cp.nama_capster,string_agg(l.nama_layanan, ', ' ORDER BY l.nama_layanan) AS layanan
       FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN capster cp ON cp.id_capster=b.id_capster
       LEFT JOIN booking_layanan bl ON bl.id_booking=b.id_booking LEFT JOIN layanan l ON l.id_layanan=bl.id_layanan
      WHERE b.tanggal_booking=${dateToday} AND b.status_booking <> 'dibatalkan'
        AND NOT EXISTS (SELECT 1 FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking AND rl.status_layanan='layanan selesai')
      GROUP BY b.id_booking,c.nama_customer,cp.nama_capster ORDER BY b.jam_mulai LIMIT 8`);
  const walkinSchedule=await pool.query(`SELECT NULL::bigint AS id_booking,t.id_transaksi,t.kode_transaksi AS kode_booking,
      t.created_at::date AS tanggal_booking,to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','HH24:MI')::time AS jam_mulai,
      t.status_layanan AS status_booking,c.nama_customer,cp.nama_capster,
      string_agg(tl.nama_layanan_snapshot, ', ' ORDER BY tl.nama_layanan_snapshot) AS layanan
      FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN capster cp ON cp.id_capster=t.id_capster
      LEFT JOIN transaksi_layanan tl ON tl.id_transaksi=t.id_transaksi
      WHERE t.jenis_transaksi='walk-in' AND t.created_at::date=${dateToday} GROUP BY t.id_transaksi,c.nama_customer,cp.nama_capster`);
  const recent = await pool.query(`SELECT id_transaksi,kode_transaksi,jenis_transaksi,total_tagihan,total_dibayar,status_transaksi,created_at FROM transaksi ORDER BY created_at DESC LIMIT 6`);
  const data = { role: req.user.role, metrics: base.rows[0], schedule: [...schedule.rows,...walkinSchedule.rows].sort((a,b)=>String(a.jam_mulai).localeCompare(String(b.jam_mulai))).slice(0,8), recentTransactions: recent.rows };
  if (req.user.role === 'owner') {
    const expenses = await pool.query(`SELECT coalesce(sum(nominal),0) AS expense_today FROM pengeluaran WHERE tanggal_pengeluaran=${dateToday}`);
    data.metrics.expenseToday = money(expenses.rows[0].expense_today);
    data.metrics.netToday = money(data.metrics.revenue_today) - data.metrics.expenseToday;
    const performance = await pool.query(`WITH served AS (
        SELECT rl.id_capster,b.tanggal_booking AS service_date FROM riwayat_layanan rl JOIN booking b ON b.id_booking=rl.id_booking WHERE rl.status_layanan='layanan selesai'
        UNION ALL SELECT id_capster,created_at::date FROM transaksi WHERE status_layanan='selesai'
      ) SELECT c.id_capster,c.nama_capster,count(s.id_capster)::int AS customers,100000 + count(s.id_capster) * 10000 AS earnings
          FROM capster c LEFT JOIN served s ON s.id_capster=c.id_capster AND s.service_date=${dateToday}
         GROUP BY c.id_capster,c.nama_capster ORDER BY customers DESC,c.nama_capster`);
    data.capsterPerformance = performance.rows;
  }
  res.json(data);
}));

// Admin/Cashier: online bookings are read and payment monitoring is read-only; manual bookings are not created.
app.get('/api/internal/bookings', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const params = [];
  let where = 'TRUE';
  if (req.query.status) { params.push(String(req.query.status)); where += ` AND b.status_booking=$${params.length}`; }
  const { rows } = await pool.query(
    `SELECT b.id_booking,b.kode_booking,b.tanggal_booking,b.jam_mulai,b.jam_selesai,b.status_booking,b.total_harga,b.nominal_dp,
            c.nama_customer,c.no_whatsapp,cp.nama_capster,
            (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC LIMIT 1) AS status_layanan,
            string_agg(l.nama_layanan, ', ' ORDER BY l.nama_layanan) AS layanan,
            coalesce((SELECT string_agg(p.status_pembayaran || ':' || p.nominal::text, ',') FROM pembayaran p WHERE p.id_booking=b.id_booking),'') AS pembayaran
       FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN capster cp ON cp.id_capster=b.id_capster
       LEFT JOIN booking_layanan bl ON bl.id_booking=b.id_booking LEFT JOIN layanan l ON l.id_layanan=bl.id_layanan
      WHERE ${where} GROUP BY b.id_booking,c.nama_customer,c.no_whatsapp,cp.nama_capster
      ORDER BY b.tanggal_booking DESC,b.jam_mulai DESC LIMIT 200`, params);
  res.json({ bookings: rows });
}));
app.get('/api/internal/payments', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id_pembayaran,p.id_booking,p.jenis_pembayaran,p.metode_pembayaran,p.nominal,p.status_pembayaran,p.ref_gateway,p.waktu_bayar,
            b.kode_booking,c.nama_customer,c.no_whatsapp
       FROM pembayaran p JOIN booking b ON b.id_booking=p.id_booking JOIN customer c ON c.id_customer=b.id_customer
      ORDER BY p.waktu_bayar DESC NULLS LAST,p.id_pembayaran DESC LIMIT 200`);
  res.json({ payments: rows });
}));
app.post('/api/internal/bookings/:id/settle', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id); const method=String(req.body?.paymentMethod||'').trim();
  if (!['Tunai','QRIS','Transfer Bank'].includes(method)) return fail(res,400,'Pilih metode pembayaran yang valid.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows}=await client.query(`SELECT b.id_booking,b.id_customer,b.id_capster,b.kode_booking,b.total_harga,b.status_booking,
      (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC LIMIT 1) AS latest_service_status
      FROM booking b WHERE b.id_booking=$1 FOR UPDATE`,[id]);
    const booking=rows[0];
    if (!booking) { await client.query('ROLLBACK'); return fail(res,404,'Booking tidak ditemukan.'); }
    if (booking.latest_service_status!=='layanan selesai') throw Object.assign(new Error('Pelunasan hanya dapat dicatat setelah layanan selesai.'),{status:409});
    const paid=await client.query("SELECT coalesce(sum(nominal),0) AS total FROM pembayaran WHERE id_booking=$1 AND lower(status_pembayaran) IN ('success','verified','berhasil','dibayar','paid','lunas')",[id]);
    const balance=Math.max(0,money(booking.total_harga)-money(paid.rows[0].total));
    if (balance>0) await client.query("INSERT INTO pembayaran(id_booking,jenis_pembayaran,metode_pembayaran,nominal,status_pembayaran,waktu_bayar) VALUES($1,'pelunasan',$2,$3,'dibayar',now())",[id,method,balance]);
    await client.query(`INSERT INTO transaksi(kode_transaksi,jenis_transaksi,id_booking,id_customer,id_capster,id_pengguna,total_tagihan,total_dibayar,status_transaksi,status_layanan,metode_pembayaran,created_at)
      VALUES($1,'booking',$2,$3,$4,$5,$6,$6,'lunas','selesai',$7,now())
      ON CONFLICT(id_booking) DO UPDATE SET total_dibayar=EXCLUDED.total_dibayar,status_transaksi='lunas',status_layanan='selesai',metode_pembayaran=EXCLUDED.metode_pembayaran`,
      [`TRX-${booking.kode_booking}`,id,booking.id_customer,booking.id_capster,req.user.id,booking.total_harga,method]);
    const trx=await client.query('SELECT id_transaksi FROM transaksi WHERE id_booking=$1',[id]);
    await client.query(`INSERT INTO invoice(id_booking,id_transaksi,nomor_invoice,tanggal_terbit,total_tagihan) VALUES($1,$2,$3,current_date,$4)
      ON CONFLICT(id_booking) DO UPDATE SET id_transaksi=EXCLUDED.id_transaksi,total_tagihan=EXCLUDED.total_tagihan`,[id,trx.rows[0].id_transaksi,`INV-${booking.kode_booking}`,booking.total_harga]);
    await audit(req.user.id,'pelunasan booking dicatat','booking',id,client);
    await client.query('COMMIT'); res.json({ok:true,balancePaid:balance});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.get('/api/internal/transactions', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT t.id_transaksi,t.kode_transaksi,t.jenis_transaksi,t.total_tagihan,t.total_dibayar,t.status_transaksi,t.metode_pembayaran,t.created_at,
            c.nama_customer,c.no_whatsapp,cp.nama_capster,u.nama_lengkap AS kasir,
            string_agg(coalesce(l.nama_layanan,tl.nama_layanan_snapshot), ', ' ORDER BY coalesce(l.nama_layanan,tl.nama_layanan_snapshot)) AS layanan
       FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN capster cp ON cp.id_capster=t.id_capster
       LEFT JOIN pengguna u ON u.id_pengguna=t.id_pengguna LEFT JOIN transaksi_layanan tl ON tl.id_transaksi=t.id_transaksi
       LEFT JOIN layanan l ON l.id_layanan=tl.id_layanan GROUP BY t.id_transaksi,c.nama_customer,c.no_whatsapp,cp.nama_capster,u.nama_lengkap
      ORDER BY t.created_at DESC LIMIT 200`);
  res.json({ transactions: rows });
}));
app.post('/api/internal/transactions/walk-in', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const customerName = String(req.body?.customerName || '').trim();
  const whatsapp = String(req.body?.whatsapp || '').trim();
  const capsterId = Number(req.body?.capsterId);
  const serviceIds = Array.isArray(req.body?.serviceIds) ? [...new Set(req.body.serviceIds.map(Number).filter(Number.isInteger))] : [];
  const method = String(req.body?.paymentMethod || '').trim();
  if (!customerName || !/^\+?[0-9]{8,16}$/.test(whatsapp) || !Number.isInteger(capsterId) || !serviceIds.length || !['Tunai','QRIS','Transfer Bank'].includes(method)) return fail(res, 400, 'Nama, nomor WhatsApp, capster, layanan, dan metode pembayaran wajib valid.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let customer = await client.query('SELECT id_customer FROM customer WHERE no_whatsapp=$1 ORDER BY id_customer LIMIT 1', [whatsapp]);
    if (customer.rowCount) {
      await client.query('UPDATE customer SET nama_customer=$1 WHERE id_customer=$2', [customerName, customer.rows[0].id_customer]);
    } else {
      customer = await client.query('INSERT INTO customer(nama_customer,no_whatsapp,created_at) VALUES($1,$2,now()) RETURNING id_customer', [customerName, whatsapp]);
    }
    const services = await client.query('SELECT id_layanan,nama_layanan,harga,status_aktif FROM layanan WHERE id_layanan=ANY($1::bigint[])', [serviceIds]);
    if (services.rowCount !== serviceIds.length || services.rows.some((service) => !service.status_aktif)) throw Object.assign(new Error('Layanan tidak ditemukan atau tidak aktif.'), { status: 400 });
    const capster = await client.query('SELECT id_capster FROM capster WHERE id_capster=$1 AND status_aktif=true', [capsterId]);
    if (!capster.rowCount) throw Object.assign(new Error('Capster tidak ditemukan atau tidak aktif.'), { status: 400 });
    const total = services.rows.reduce((sum, service) => sum + money(service.harga), 0);
    const trx = await client.query(
      `INSERT INTO transaksi(kode_transaksi,jenis_transaksi,id_customer,id_capster,id_pengguna,total_tagihan,total_dibayar,status_transaksi,metode_pembayaran,created_at)
       VALUES('TRX-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,6)),'walk-in',$1,$2,$3,$4,$4,'lunas',$5,now()) RETURNING id_transaksi,kode_transaksi`,
      [customer.rows[0].id_customer,capsterId,req.user.id,total,method]);
    for (const service of services.rows) await client.query(
      'INSERT INTO transaksi_layanan(id_transaksi,id_layanan,nama_layanan_snapshot,harga_satuan,subtotal) VALUES($1,$2,$3,$4,$4)',
      [trx.rows[0].id_transaksi,service.id_layanan,service.nama_layanan,service.harga]);
    await client.query('INSERT INTO invoice(id_transaksi,nomor_invoice,tanggal_terbit,total_tagihan) VALUES($1,$2,current_date,$3)',
      [trx.rows[0].id_transaksi,`INV-${trx.rows[0].kode_transaksi}`,total]);
    await client.query('INSERT INTO riwayat_layanan(id_transaksi,id_capster,status_layanan,waktu_status,catatan) VALUES($1,$2,\'menunggu layanan\',now(),$3)',
      [trx.rows[0].id_transaksi,capsterId,`Walk-in ${trx.rows[0].kode_transaksi}`]);
    await audit(req.user.id,'transaksi walk-in dibuat','transaksi',trx.rows[0].id_transaksi,client);
    await client.query('COMMIT');
    res.status(201).json({ transaction: trx.rows[0], total });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.get('/api/internal/services', requireDb, allInternal, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(req.user.role==='capster'
    ? 'SELECT id_layanan,nama_layanan,deskripsi,durasi_menit,status_aktif FROM layanan ORDER BY nama_layanan'
    : 'SELECT id_layanan,nama_layanan,deskripsi,harga,durasi_menit,status_aktif FROM layanan ORDER BY nama_layanan');
  res.json({ services: rows });
}));
app.get('/api/internal/capsters', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id_capster,nama_capster,spesialisasi,status_aktif FROM capster ORDER BY nama_capster'); res.json({ capsters: rows });
}));
app.post('/api/internal/services', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const { name, description = null, price, durationMinutes } = req.body || {};
  if (!String(name || '').trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1) return fail(res, 400, 'Nama, harga, dan durasi layanan tidak valid.');
  const { rows } = await pool.query('INSERT INTO layanan(nama_layanan,deskripsi,harga,durasi_menit,status_aktif) VALUES($1,$2,$3,$4,true) RETURNING *', [String(name).trim(),description,Number(price),Number(durationMinutes)]);
  await audit(req.user.id,'layanan dibuat','layanan',rows[0].id_layanan);
  res.status(201).json({ service: rows[0] });
}));
app.patch('/api/internal/services/:id', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const id = Number(req.params.id); const { name, description, price, durationMinutes, active } = req.body || {};
  if (!Number.isInteger(id) || id < 1 || (price != null && (!Number.isFinite(Number(price)) || Number(price) < 0)) || (durationMinutes != null && (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1)) || (active != null && typeof active !== 'boolean')) return fail(res,400,'Perubahan layanan tidak valid.');
  const { rows } = await pool.query(
    `UPDATE layanan SET nama_layanan=coalesce($2,nama_layanan),deskripsi=coalesce($3,deskripsi),harga=coalesce($4,harga),durasi_menit=coalesce($5,durasi_menit),status_aktif=coalesce($6,status_aktif)
      WHERE id_layanan=$1 RETURNING *`, [id,name ?? null,description ?? null,price == null ? null : Number(price),durationMinutes == null ? null : Number(durationMinutes),typeof active === 'boolean' ? active : null]);
  if (!rows[0]) return fail(res, 404, 'Layanan tidak ditemukan.'); await audit(req.user.id,'layanan diperbarui','layanan',id); res.json({ service: rows[0] });
}));

app.get('/api/internal/customers', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id_customer,c.nama_customer,c.no_whatsapp,c.created_at,count(DISTINCT b.id_booking)::int AS jumlah_booking,count(DISTINCT t.id_transaksi)::int AS jumlah_transaksi
       FROM customer c LEFT JOIN booking b ON b.id_customer=c.id_customer LEFT JOIN transaksi t ON t.id_customer=c.id_customer
      GROUP BY c.id_customer ORDER BY c.created_at DESC LIMIT 250`);
  res.json({ customers: rows });
}));

// Capster workspace.
app.get('/api/internal/capster/schedule', requireDb, capsterOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id_booking,b.kode_booking,b.tanggal_booking,b.jam_mulai,b.jam_selesai,b.status_booking,b.total_harga,b.nominal_dp,
            c.nama_customer,c.no_whatsapp,string_agg(l.nama_layanan, ', ' ORDER BY l.nama_layanan) AS layanan,
            (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC LIMIT 1) AS status_layanan
       FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN booking_layanan bl ON bl.id_booking=b.id_booking
       LEFT JOIN layanan l ON l.id_layanan=bl.id_layanan WHERE b.id_capster=$1 AND b.tanggal_booking >= ${dateToday} AND b.status_booking NOT IN ('dibatalkan','selesai','tidak_hadir')
         AND NOT EXISTS (SELECT 1 FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking AND rl.status_layanan='layanan selesai')
      GROUP BY b.id_booking,c.nama_customer,c.no_whatsapp ORDER BY b.tanggal_booking,b.jam_mulai LIMIT 300`, [req.user.capsterId]);
  const walkins=await pool.query(`SELECT NULL::bigint AS id_booking,t.id_transaksi,t.kode_transaksi AS kode_booking,
      t.created_at::date AS tanggal_booking,to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','HH24:MI')::time AS jam_mulai,
      t.status_layanan AS status_booking,c.nama_customer,c.no_whatsapp,
      string_agg(tl.nama_layanan_snapshot, ', ' ORDER BY tl.nama_layanan_snapshot) AS layanan,t.status_layanan
      FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN transaksi_layanan tl ON tl.id_transaksi=t.id_transaksi
      WHERE t.id_capster=$1 AND t.jenis_transaksi='walk-in' AND t.status_layanan <> 'selesai'
      GROUP BY t.id_transaksi,c.nama_customer ORDER BY t.created_at DESC`,[req.user.capsterId]);
  res.json({ schedule: [...rows,...walkins.rows].sort((a,b)=>String(a.tanggal_booking).localeCompare(String(b.tanggal_booking)) || String(a.jam_mulai).localeCompare(String(b.jam_mulai))) });
}));
app.get('/api/internal/capster/history', requireDb, capsterOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id_booking,b.kode_booking,b.tanggal_booking,b.jam_mulai,b.status_booking,c.nama_customer,
            string_agg(l.nama_layanan, ', ' ORDER BY l.nama_layanan) AS layanan
       FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN booking_layanan bl ON bl.id_booking=b.id_booking
       LEFT JOIN layanan l ON l.id_layanan=bl.id_layanan WHERE b.id_capster=$1
         AND EXISTS (SELECT 1 FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking AND rl.status_layanan='layanan selesai')
      GROUP BY b.id_booking,c.nama_customer ORDER BY b.tanggal_booking DESC,b.jam_mulai DESC LIMIT 200`, [req.user.capsterId]);
  const walkins=await pool.query(`SELECT NULL::bigint AS id_booking,t.id_transaksi,t.kode_transaksi AS kode_booking,t.created_at::date AS tanggal_booking,
      to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','HH24:MI')::time AS jam_mulai,'selesai' AS status_booking,c.nama_customer,
      string_agg(tl.nama_layanan_snapshot, ', ' ORDER BY tl.nama_layanan_snapshot) AS layanan
      FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN transaksi_layanan tl ON tl.id_transaksi=t.id_transaksi
      WHERE t.id_capster=$1 AND t.status_layanan='selesai' GROUP BY t.id_transaksi,c.nama_customer`,[req.user.capsterId]);
  res.json({ history: [...rows,...walkins.rows].sort((a,b)=>String(b.tanggal_booking).localeCompare(String(a.tanggal_booking))) });
}));
app.get('/api/internal/capster/earnings', requireDb, capsterOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `WITH served AS (
       SELECT b.tanggal_booking AS period FROM riwayat_layanan rl JOIN booking b ON b.id_booking=rl.id_booking WHERE rl.id_capster=$1 AND rl.status_layanan='layanan selesai'
       UNION ALL SELECT created_at::date FROM transaksi WHERE id_capster=$1 AND status_layanan='selesai'
     ) SELECT period,count(*)::int AS customers,100000 + count(*) * 10000 AS earnings
       FROM served WHERE period >= now()::date - interval '30 days' GROUP BY period ORDER BY period DESC`, [req.user.capsterId]);
  res.json({ earnings: rows });
}));
app.patch('/api/internal/capster/bookings/:id/status', requireDb, capsterOnly, asyncRoute(async (req, res) => {
  const id = Number(req.params.id); const action = String(req.body?.action || '');
  if (!['start','complete','no-show'].includes(action)) return fail(res, 400, 'Aksi status tidak valid.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT b.id_booking,b.status_booking,b.tanggal_booking,b.tipe_booking,b.nominal_dp,
      (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC LIMIT 1) AS latest_service_status
      FROM booking b WHERE b.id_booking=$1 AND b.id_capster=$2 FOR UPDATE`, [id,req.user.capsterId]);
    if (!rows[0]) { await client.query('ROLLBACK'); return fail(res, 404, 'Booking tidak ditemukan.'); }
    const activeStatuses=['dikonfirmasi','terkonfirmasi','confirmed','menunggu antrean'];
    if (action === 'no-show') {
      if (!activeStatuses.includes(rows[0].status_booking)) throw Object.assign(new Error('Hanya booking terkonfirmasi yang dapat ditandai tidak hadir.'), { status: 409 });
      if (['layanan dimulai','layanan selesai'].includes(rows[0].latest_service_status)) throw Object.assign(new Error('Booking dengan layanan yang sudah dimulai tidak dapat ditandai tidak hadir.'),{status:409});
      if (String(rows[0].tanggal_booking).slice(0,10)!==new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())) throw Object.assign(new Error('Booking hanya dapat ditandai tidak hadir pada tanggal jadwalnya.'), { status: 409 });
      await client.query("UPDATE booking SET status_booking='tidak_hadir' WHERE id_booking=$1", [id]);
      await audit(req.user.id,'booking ditandai tidak hadir','booking',id,client);
    } else {
      const target = action === 'start' ? 'layanan dimulai' : 'layanan selesai';
      if (action === 'start' && !activeStatuses.includes(rows[0].status_booking)) throw Object.assign(new Error('Booking belum terkonfirmasi atau tidak dapat dimulai.'), { status: 409 });
      if (action === 'start' && ['layanan dimulai','layanan selesai'].includes(rows[0].latest_service_status)) throw Object.assign(new Error('Progres layanan booking ini sudah dimulai atau selesai.'),{status:409});
      if (action === 'start' && rows[0].tipe_booking !== 'walk-in' && money(rows[0].nominal_dp) > 0) {
        const dp = await client.query("SELECT coalesce(sum(nominal),0) AS paid FROM pembayaran WHERE id_booking=$1 AND lower(status_pembayaran) IN ('success','verified','terverifikasi','berhasil','dibayar','paid','lunas')",[id]);
        if (money(dp.rows[0].paid) < money(rows[0].nominal_dp)) throw Object.assign(new Error('DP booking belum terverifikasi.'), { status: 409 });
      }
      if (action === 'complete' && rows[0].latest_service_status !== 'layanan dimulai') throw Object.assign(new Error('Layanan harus dimulai sebelum diselesaikan.'), { status: 409 });
      await client.query("INSERT INTO riwayat_layanan(id_booking,id_capster,status_layanan,waktu_status,catatan) VALUES($1,$2,$3,now(),NULL)", [id,req.user.capsterId,target]);
      await audit(req.user.id,action === 'start' ? 'layanan dimulai' : 'layanan selesai','booking',id,client);
    }
    await client.query('COMMIT'); res.json({ ok: true });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
app.patch('/api/internal/capster/transactions/:id/status', requireDb, capsterOnly, asyncRoute(async (req,res) => {
  const id=Number(req.params.id); const action=String(req.body?.action||'');
  if (!['start','complete'].includes(action)) return fail(res,400,'Aksi status tidak valid.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows}=await client.query("SELECT id_transaksi,status_layanan FROM transaksi WHERE id_transaksi=$1 AND id_capster=$2 AND jenis_transaksi='walk-in' FOR UPDATE",[id,req.user.capsterId]);
    if (!rows[0]) { await client.query('ROLLBACK'); return fail(res,404,'Transaksi walk-in tidak ditemukan.'); }
    if (action==='start' && rows[0].status_layanan!=='menunggu') throw Object.assign(new Error('Layanan walk-in tidak dapat dimulai dari status ini.'),{status:409});
    if (action==='complete' && rows[0].status_layanan!=='sedang_dilayani') throw Object.assign(new Error('Mulai layanan sebelum menyelesaikannya.'),{status:409});
    const status=action==='start'?'sedang_dilayani':'selesai';
    await client.query('UPDATE transaksi SET status_layanan=$2 WHERE id_transaksi=$1',[id,status]);
    await client.query('INSERT INTO riwayat_layanan(id_transaksi,id_capster,status_layanan,waktu_status) VALUES($1,$2,$3,now())',[id,req.user.capsterId,action==='start'?'layanan dimulai':'layanan selesai']);
    await audit(req.user.id,action==='start'?'layanan walk-in dimulai':'layanan walk-in selesai','transaksi',id,client);
    await client.query('COMMIT'); res.json({ok:true});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.post('/api/internal/bookings/:id/queue-return', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id); const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows}=await client.query('SELECT id_booking,id_capster,tanggal_booking,jam_mulai,jam_selesai,status_booking FROM booking WHERE id_booking=$1 FOR UPDATE',[id]);
    const booking=rows[0];
    if (!booking) { await client.query('ROLLBACK'); return fail(res,404,'Booking tidak ditemukan.'); }
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if (booking.status_booking!=='tidak_hadir' || String(booking.tanggal_booking).slice(0,10)!==today) throw Object.assign(new Error('Hanya booking tidak hadir hari ini yang dapat dimasukkan kembali ke antrean.'),{status:409});
    await client.query("INSERT INTO antrean_kosong(id_booking,id_capster,tanggal,jam_mulai,jam_selesai,status_antrean) VALUES($1,$2,$3,$4,$5,'menunggu')",[id,booking.id_capster,booking.tanggal_booking,booking.jam_mulai,booking.jam_selesai]);
    await client.query("UPDATE booking SET status_booking='menunggu antrean' WHERE id_booking=$1",[id]);
    await audit(req.user.id,'booking kembali masuk antrean','booking',id,client);
    await client.query('COMMIT'); res.json({ok:true});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

// Owner: staff, expenses, DP policy, gallery, reports.
app.get('/api/internal/staff', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(`SELECT u.id_pengguna,u.nama_lengkap,u.email,u.role,u.status_aktif,c.id_capster,c.nama_capster,c.spesialisasi,c.foto
    FROM pengguna u LEFT JOIN capster c ON c.id_pengguna=u.id_pengguna WHERE u.role IN ('admin','capster','owner') ORDER BY u.role,u.nama_lengkap`);
  res.json({ staff: rows });
}));
app.post('/api/internal/staff', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const name = String(req.body?.name || '').trim(); const email = String(req.body?.email || '').trim().toLowerCase(); const password = String(req.body?.password || ''); const role = String(req.body?.role || '');
  if (!name || !email || password.length < 10 || !['admin','capster'].includes(role)) return fail(res, 400, 'Nama, email, password minimal 10 karakter, dan role admin/capster wajib valid.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO pengguna(nama_lengkap,email,password_hash,role,status_aktif) VALUES($1,$2,$3,$4,true) RETURNING id_pengguna,nama_lengkap,email,role,status_aktif', [name,email,await bcrypt.hash(password,12),role]);
    if (role === 'capster') await client.query('INSERT INTO capster(id_pengguna,nama_capster,status_aktif) VALUES($1,$2,true)', [rows[0].id_pengguna,String(req.body?.capsterName || name).trim()]);
    await audit(req.user.id,'akun staf dibuat','pengguna',rows[0].id_pengguna,client);
    await client.query('COMMIT'); res.status(201).json({ user: rows[0] });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.patch('/api/internal/staff/:id/status', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  if (typeof req.body?.active !== 'boolean') return fail(res,400,'Status aktif harus boolean.');
  const { rows } = await pool.query('UPDATE pengguna SET status_aktif=$2 WHERE id_pengguna=$1 AND role IN (\'admin\',\'capster\') RETURNING id_pengguna,nama_lengkap,email,role,status_aktif', [Number(req.params.id),req.body.active]);
  if (!rows[0]) return fail(res,404,'Akun staf tidak ditemukan.');
  if (rows[0].role === 'capster') await pool.query('UPDATE capster SET status_aktif=$2 WHERE id_pengguna=$1', [rows[0].id_pengguna,rows[0].status_aktif]);
  await audit(req.user.id,rows[0].status_aktif?'akun staf diaktifkan':'akun staf dinonaktifkan','pengguna',rows[0].id_pengguna);
  res.json({ user: rows[0] });
}));
app.get('/api/internal/expenses', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id_pengeluaran,kategori,deskripsi,nominal,tanggal_pengeluaran FROM pengeluaran ORDER BY tanggal_pengeluaran DESC,id_pengeluaran DESC LIMIT 300');
  res.json({ expenses: rows });
}));
app.post('/api/internal/expenses', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const category = String(req.body?.category || '').trim(); const amount = Number(req.body?.amount); const date = String(req.body?.date || '');
  if (!category || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res,400,'Kategori, nominal positif, dan tanggal valid wajib diisi.');
  const { rows } = await pool.query('INSERT INTO pengeluaran(id_pengguna,kategori,deskripsi,nominal,tanggal_pengeluaran) VALUES($1,$2,$3,$4,$5) RETURNING *', [req.user.id,category,String(req.body?.description || '').trim() || null,amount,date]);
  await audit(req.user.id,'pengeluaran dicatat','pengeluaran',rows[0].id_pengeluaran);
  res.status(201).json({ expense: rows[0] });
}));
app.get('/api/internal/dp-settings', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM pengaturan_dp ORDER BY berlaku_sejak DESC LIMIT 1'); res.json({ setting: rows[0] || null });
}));
app.post('/api/internal/dp-settings', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const percent = Number(req.body?.percent); const effectiveDate = String(req.body?.effectiveDate || '');
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return fail(res,400,'Persentase 0-100 dan tanggal berlaku wajib valid.');
  const { rows } = await pool.query('INSERT INTO pengaturan_dp(id_pengguna,persentase_dp,berlaku_sejak) VALUES($1,$2,$3) RETURNING *', [req.user.id,percent,effectiveDate]); await audit(req.user.id,'pengaturan DP diperbarui','pengaturan_dp',rows[0].id_pengaturan); res.status(201).json({ setting: rows[0] });
}));
app.get('/api/internal/gallery', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id_galeri,judul,file_gambar,created_at FROM galeri ORDER BY created_at DESC'); res.json({ gallery: rows });
}));
app.post('/api/internal/gallery', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const title = String(req.body?.title || '').trim(); const image = String(req.body?.image || '').trim();
  if (!title || !image) return fail(res,400,'Judul dan referensi gambar wajib diisi.');
  const { rows } = await pool.query('INSERT INTO galeri(id_pengguna,judul,file_gambar,created_at) VALUES($1,$2,$3,now()) RETURNING *',[req.user.id,title,image]); await audit(req.user.id,'item galeri dibuat','galeri',rows[0].id_galeri); res.status(201).json({ item: rows[0] });
}));
app.delete('/api/internal/gallery/:id', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const id=Number(req.params.id); const result = await pool.query('DELETE FROM galeri WHERE id_galeri=$1',[id]); if (!result.rowCount) return fail(res,404,'Item galeri tidak ditemukan.'); await audit(req.user.id,'item galeri dihapus','galeri',id); res.json({ ok:true });
}));
app.get('/api/internal/reports', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const start = String(req.query.start || `${new Date().getFullYear()}-01-01`); const end = String(req.query.end || new Date().toISOString().slice(0,10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start>end) return fail(res,400,'Periode laporan tidak valid.');
  const { rows } = await pool.query(
    `SELECT d::date AS tanggal,coalesce(t.pendapatan,0) AS pendapatan,coalesce(e.pengeluaran,0) AS pengeluaran,
            coalesce(t.transaksi,0)::int AS jumlah_transaksi,coalesce(t.pelanggan,0)::int AS pelanggan
       FROM generate_series($1::date,$2::date,'1 day') d
       LEFT JOIN (SELECT created_at::date AS hari,sum(total_dibayar) AS pendapatan,count(*) AS transaksi,count(DISTINCT id_customer) AS pelanggan FROM transaksi WHERE created_at::date BETWEEN $1 AND $2 GROUP BY 1) t ON t.hari=d::date
       LEFT JOIN (SELECT tanggal_pengeluaran AS hari,sum(nominal) AS pengeluaran FROM pengeluaran WHERE tanggal_pengeluaran BETWEEN $1 AND $2 GROUP BY 1) e ON e.hari=d::date
      ORDER BY tanggal`, [start,end]);
  res.json({ reports: rows });
}));
app.post('/api/internal/reports/export', requireDb, ownerOnly, asyncRoute(async (req,res) => {
  const start=String(req.body?.start||''); const end=String(req.body?.end||''); const format=String(req.body?.format||'');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start>end || !['csv','pdf'].includes(format)) return fail(res,400,'Periode atau format ekspor tidak valid.');
  const {rows}=await pool.query('INSERT INTO laporan(id_pengguna,jenis_laporan,periode_mulai,periode_selesai,format_ekspor,created_at) VALUES($1,$2,$3,$4,$5,now()) RETURNING id_laporan',[req.user.id,'operasional-keuangan',start,end,format]);
  await audit(req.user.id,'laporan diekspor','laporan',rows[0].id_laporan);
  res.status(201).json({ok:true,id:rows[0].id_laporan});
}));
app.get('/api/internal/audit', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(`SELECT j.id_log,j.waktu,j.aksi,j.jenis_objek,j.id_objek,u.nama_lengkap FROM jejak_audit j LEFT JOIN pengguna u ON u.id_pengguna=j.id_pengguna ORDER BY j.waktu DESC LIMIT 300`); res.json({ audit: rows });
}));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err.code === '23505') return fail(res, 409, 'Data sudah digunakan atau duplikat.');
  if (err.code === '23503') return fail(res, 400, 'Referensi data tidak valid.');
  return fail(res, err.status || 500, err.status ? err.message : 'Terjadi kesalahan pada server.');
});

app.listen(PORT, () => console.log(`PitStop internal API listening on http://localhost:${PORT}`));
