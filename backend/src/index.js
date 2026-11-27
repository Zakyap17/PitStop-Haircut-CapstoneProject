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
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, keepAlive: true, keepAliveInitialDelayMillis: 10000, max: 10 })
  : null;
const roles = ['owner', 'admin', 'capster'];

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());
app.use('/api/internal', (req,res,next) => {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin=req.get('origin');
  if (origin && !allowedOrigins.includes(origin)) return fail(res,403,'Origin tidak diizinkan.');
  next();
});

function fail(res, status, message) { return res.status(status).json({ error: message }); }
function imageData(value, maxBytes, label) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`Format ${label.toLowerCase()} tidak valid.`);
  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error(`${label} harus berupa JPG, PNG, WEBP, atau GIF.`);
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > maxBytes) throw new Error(`Ukuran ${label.toLowerCase()} maksimal ${maxBytes / 1024 / 1024} MB.`);
  const mime = match[1];
  const valid = mime === 'image/png' ? bytes.subarray(0,4).equals(Buffer.from([0x89,0x50,0x4e,0x47]))
    : mime === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : mime === 'image/gif' ? ['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString())
    : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  if (!valid) throw new Error('Isi file tidak cocok dengan format gambar.');
  return value;
}
const capsterPhoto = (value) => imageData(value, 2 * 1024 * 1024, 'Foto');
const galleryImage = (value) => imageData(value, 2 * 1024 * 1024, 'Gambar');
function whatsappNumber(value) {
  let number=String(value||'').replace(/\D/g,'');
  if(number.startsWith('0')) number=number.slice(1);
  if(!number.startsWith('62')) number=`62${number}`;
  return number;
}
async function sendInvoiceWhatsApp({notificationId,number,message}) {
  if(!process.env.FONNTE_TOKEN) {
    await pool.query("UPDATE notifikasi_whatsapp SET status_kirim='menunggu_konfigurasi' WHERE id_notifikasi=$1",[notificationId]);
    return 'menunggu_konfigurasi';
  }
  try {
    const body=new FormData(); body.set('target',whatsappNumber(number)); body.set('countryCode','62'); body.set('message',message); body.set('connectOnly','false');
    const response=await fetch('https://api.fonnte.com/send',{method:'POST',headers:{Authorization:process.env.FONNTE_TOKEN},body,signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.status!==true) throw new Error(String(result.reason||result.detail||`Fonnte HTTP ${response.status}`));
    await pool.query("UPDATE notifikasi_whatsapp SET status_kirim='terkirim',waktu_kirim=now() WHERE id_notifikasi=$1",[notificationId]);
    return 'terkirim';
  } catch(error) {
    console.error('Invoice WhatsApp delivery failed:',error?.message||'unknown');
    await pool.query("UPDATE notifikasi_whatsapp SET status_kirim='gagal' WHERE id_notifikasi=$1",[notificationId]);
    return 'gagal';
  }
}
const invoiceMessage=({invoice,code,name,service,barber,date,time,total,paid})=>[
  'PITSTOP BARBERSHOP — INVOICE',`Nomor invoice: ${invoice}`,`Kode booking/transaksi: ${code}`,`Nama: ${name}`,
  service?`Layanan: ${service}`:null,barber?`Capster: ${barber}`:null,date?`Jadwal: ${date}${time?` pukul ${String(time).slice(0,5)}`:''}`:null,
  `Total tagihan: Rp${new Intl.NumberFormat('id-ID').format(Number(total||0))}`,`Total dibayar: Rp${new Intl.NumberFormat('id-ID').format(Number(paid||0))}`,'Status pembayaran: LUNAS','Terima kasih telah menggunakan layanan PitStop.'
].filter(Boolean).join('\n');
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
    let claims;
    try {
      claims = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error?.name==='JsonWebTokenError' || error?.name==='TokenExpiredError') return fail(res,401,'Sesi login tidak valid atau sudah kedaluwarsa.');
      return fail(res,401,'Sesi login tidak valid. Silakan masuk kembali.');
    }
    if (!requiredRoles.includes(claims.role)) return fail(res, 403, 'Akses tidak diizinkan untuk role ini.');
    if (!pool) return fail(res,503,'Database belum dikonfigurasi.');
    const transientCodes=new Set(['ETIMEDOUT','ECONNRESET','ECONNREFUSED','EHOSTUNREACH','EAUTHTIMEOUT','08006','08001','57P01']);
    let rows;
    for(let attempt=0;attempt<2;attempt++) {
      try { ({rows}=await pool.query('SELECT u.id_pengguna,u.nama_lengkap,u.email,u.role,u.status_aktif,c.id_capster,c.status_aktif AS capster_aktif FROM pengguna u LEFT JOIN capster c ON c.id_pengguna=u.id_pengguna WHERE u.id_pengguna=$1',[Number(claims.sub)])); break; }
      catch(error) {
        const code=error?.code || error?.errors?.[0]?.code || error?.cause?.code;
        if(attempt===0&&transientCodes.has(code)) { await new Promise(resolve=>setTimeout(resolve,200)); continue; }
        console.error('Account verification database query failed:',code||'unknown',error?.message||'');
        return fail(res,503,'Database sementara tidak dapat memverifikasi akun. Coba lagi.');
      }
    }
    const active=rows?.[0];
    if (!active || !active.status_aktif || !requiredRoles.includes(active.role)) return fail(res,401,'Akun tidak aktif atau sesi sudah tidak berlaku.');
    if (active.role==='capster' && !active.id_capster) return fail(res,403,'Profil capster belum tersedia.');
    if (active.role==='capster' && !active.capster_aktif) return fail(res,401,'Akun capster tidak aktif.');
    req.user = { id: Number(active.id_pengguna), name: active.nama_lengkap, email: active.email, role: active.role, capsterId: active.id_capster || null };
    next();
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
const jakartaTodayString = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function isoDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year,month,day]=value.split('-').map(Number); const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date:null;
}
const dateString = (date) => date.toISOString().slice(0,10);
function reportBounds(granularity, anchor, from, to) {
  const today=isoDate(jakartaTodayString());
  const selected=isoDate(anchor)||today;
  if(granularity==='custom') {
    const start=isoDate(from); const end=isoDate(to);
    if(!start||!end||start>end||end>today) return null;
    return {start:dateString(start),end:dateString(end),bucket:(end-start)/86400000<=31?'day':(end-start)/86400000<=180?'week':(end-start)/86400000<=1460?'month':'year'};
  }
  if(!['daily','weekly','monthly','yearly'].includes(granularity)||selected>today) return null;
  let start=new Date(selected); let end=new Date(selected);
  if(granularity==='weekly') { const weekday=(start.getUTCDay()+6)%7; start.setUTCDate(start.getUTCDate()-weekday); end=new Date(start); end.setUTCDate(end.getUTCDate()+6); }
  if(granularity==='monthly') { start.setUTCDate(1); end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)); }
  if(granularity==='yearly') { start=new Date(Date.UTC(start.getUTCFullYear(),0,1)); end=new Date(Date.UTC(start.getUTCFullYear(),11,31)); }
  if(end>today) end=new Date(today);
  return {start:dateString(start),end:dateString(end),bucket:{daily:'day',weekly:'day',monthly:'day',yearly:'month'}[granularity]};
}
function bucketStart(value, unit) {
  const date=isoDate(String(value).slice(0,10)); if(!date) return String(value).slice(0,10);
  if(unit==='week') date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
  if(unit==='month') date.setUTCDate(1);
  if(unit==='year') { date.setUTCMonth(0,1); }
  return dateString(date);
}
function addBucket(value, unit) {
  const date=isoDate(value); if(unit==='day') date.setUTCDate(date.getUTCDate()+1);
  if(unit==='week') date.setUTCDate(date.getUTCDate()+7);
  if(unit==='month') date.setUTCMonth(date.getUTCMonth()+1);
  if(unit==='year') date.setUTCFullYear(date.getUTCFullYear()+1);
  return dateString(date);
}
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
        WHERE b.id_capster=$1 AND b.tanggal_booking >= ${dateToday} AND b.status_booking NOT IN ('dibatalkan','selesai','tidak_hadir','customer terlambat')
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

// Periodic owner and personal capster charts. All amounts come from persisted records.
app.get('/api/internal/dashboard/charts', requireDb, auth(['owner','capster']), asyncRoute(async (req,res) => {
  const periods = {
    daily: { unit: 'day', count: 7, step: '1 day' },
    weekly: { unit: 'week', count: 8, step: '1 week' },
    monthly: { unit: 'month', count: 12, step: '1 month' },
    yearly: { unit: 'year', count: 5, step: '1 year' },
  };
  const period = periods[String(req.query.period || 'daily')];
  if (!period) return fail(res,400,'Filter periode grafik tidak valid.');

  if (req.user.role === 'owner') {
    const { rows } = await pool.query(
      `WITH bounds AS (
         SELECT date_trunc($1, now() AT TIME ZONE 'Asia/Jakarta')::date AS end_bucket
       ), buckets AS (
         SELECT generate_series((end_bucket - (($2::int - 1) * $3::interval))::date,end_bucket,$3::interval)::date AS bucket_start FROM bounds
       ), revenue AS (
         SELECT date_trunc($1, t.created_at AT TIME ZONE 'Asia/Jakarta')::date AS bucket_start,
                sum(t.total_dibayar)::numeric AS amount
           FROM transaksi t WHERE t.created_at AT TIME ZONE 'Asia/Jakarta' >= (SELECT min(bucket_start)::timestamp FROM buckets)
           GROUP BY 1
       ), expenses AS (
         SELECT date_trunc($1, e.tanggal_pengeluaran::timestamp)::date AS bucket_start,
                sum(e.nominal)::numeric AS amount
           FROM pengeluaran e WHERE e.tanggal_pengeluaran >= (SELECT min(bucket_start) FROM buckets)
             AND e.tanggal_pengeluaran <= (now() AT TIME ZONE 'Asia/Jakarta')::date
           GROUP BY 1
       )
       SELECT to_char(b.bucket_start,'YYYY-MM-DD') AS bucket_start,coalesce(r.amount,0)::numeric AS revenue,coalesce(e.amount,0)::numeric AS expenses
         FROM buckets b LEFT JOIN revenue r USING(bucket_start) LEFT JOIN expenses e USING(bucket_start)
        ORDER BY b.bucket_start`,
      [period.unit,period.count,period.step],
    );
    return res.json({ role:'owner',period:String(req.query.period || 'daily'),series:rows });
  }

  const { rows } = await pool.query(
    `WITH bounds AS (
       SELECT date_trunc($1, now() AT TIME ZONE 'Asia/Jakarta')::date AS end_bucket
     ), buckets AS (
       SELECT generate_series((end_bucket - (($2::int - 1) * $3::interval))::date,end_bucket,$3::interval)::date AS bucket_start FROM bounds
     ), served_days AS (
       SELECT b.tanggal_booking::date AS service_date,count(*)::int AS customers
         FROM riwayat_layanan rl JOIN booking b ON b.id_booking=rl.id_booking
        WHERE rl.id_capster=$4 AND rl.status_layanan='layanan selesai'
        GROUP BY b.tanggal_booking::date
       UNION ALL
       SELECT (t.created_at AT TIME ZONE 'Asia/Jakarta')::date AS service_date,count(*)::int AS customers
         FROM transaksi t WHERE t.id_capster=$4 AND t.status_layanan='selesai'
        GROUP BY (t.created_at AT TIME ZONE 'Asia/Jakarta')::date
     ), daily AS (
       SELECT service_date,sum(customers)::int AS customers FROM served_days GROUP BY service_date
     )
     SELECT to_char(b.bucket_start,'YYYY-MM-DD') AS bucket_start,coalesce(sum(100000 + d.customers * 10000),0)::numeric AS earnings
       FROM buckets b LEFT JOIN daily d ON date_trunc($1,d.service_date::timestamp)::date=b.bucket_start
      GROUP BY b.bucket_start ORDER BY b.bucket_start`,
    [period.unit,period.count,period.step,req.user.capsterId],
  );
  res.json({ role:'capster',period:String(req.query.period || 'daily'),series:rows });
}));

// Admin/Cashier manage the service and payment lifecycles independently.
app.get('/api/internal/bookings', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(`SELECT b.id_booking,b.kode_booking,b.tanggal_booking,b.jam_mulai,b.jam_selesai,b.status_booking,b.total_harga,b.nominal_dp,
      c.nama_customer,c.no_whatsapp,b.id_capster,cp.nama_capster,
      coalesce(last_service.status_layanan,'belum dimulai') AS status_layanan,
      coalesce(pay.paid,0)::numeric AS total_dibayar,
      CASE WHEN coalesce(pay.paid,0)>=b.total_harga THEN 'lunas' ELSE 'belum' END AS status_pembayaran,
      coalesce(pay.payments,'[]'::jsonb) AS pembayaran,
      notice.status_kirim AS status_notifikasi,
      string_agg(l.nama_layanan,', ' ORDER BY l.nama_layanan) AS layanan,
      coalesce((SELECT sum(bl2.subtotal) FROM booking_layanan bl2 WHERE bl2.id_booking=b.id_booking),0)::numeric AS nilai_layanan
    FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN capster cp ON cp.id_capster=b.id_capster
    LEFT JOIN booking_layanan bl ON bl.id_booking=b.id_booking LEFT JOIN layanan l ON l.id_layanan=bl.id_layanan
    LEFT JOIN LATERAL (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC,rl.id_riwayat DESC LIMIT 1) last_service ON true
    LEFT JOIN LATERAL (SELECT coalesce(sum(p.nominal) FILTER(WHERE lower(p.status_pembayaran) IN ('success','verified','terverifikasi','berhasil','dibayar','paid','lunas')),0) AS paid,
      coalesce(jsonb_agg(jsonb_build_object('id',p.id_pembayaran,'jenis',p.jenis_pembayaran,'metode',p.metode_pembayaran,'nominal',p.nominal,'status',p.status_pembayaran,'waktu',p.waktu_bayar) ORDER BY p.waktu_bayar,p.id_pembayaran) FILTER(WHERE p.id_pembayaran IS NOT NULL),'[]'::jsonb) AS payments
      FROM pembayaran p WHERE p.id_booking=b.id_booking) pay ON true
    LEFT JOIN LATERAL (SELECT n.status_kirim FROM notifikasi_whatsapp n WHERE n.id_booking=b.id_booking ORDER BY n.id_notifikasi DESC LIMIT 1) notice ON true
    GROUP BY b.id_booking,c.nama_customer,c.no_whatsapp,cp.nama_capster,last_service.status_layanan,pay.paid,pay.payments,notice.status_kirim
    ORDER BY b.tanggal_booking DESC,b.jam_mulai DESC LIMIT 300`);
  res.json({ bookings: rows });
}));
app.get('/api/internal/bookings/:id/available-slots', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id),capsterId=Number(req.query.capsterId),date=String(req.query.date||'');
  if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(capsterId)||capsterId<1||!isoDate(date)) return fail(res,400,'Booking, capster, atau tanggal tidak valid.');
  const current=await pool.query('SELECT id_booking,(extract(epoch FROM (jam_selesai-jam_mulai))/60)::int AS duration FROM booking WHERE id_booking=$1',[id]);
  if(!current.rows[0]) return fail(res,404,'Booking tidak ditemukan.');
  const barber=await pool.query('SELECT id_capster FROM capster c JOIN pengguna u ON u.id_pengguna=c.id_pengguna WHERE c.id_capster=$1 AND c.status_aktif=true AND c.tersedia=true AND u.status_aktif=true AND u.deleted_at IS NULL',[capsterId]);
  if(!barber.rowCount) return res.json({slots:[]});
  const slots=['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','19:00','20:00'];
  const {rows}=await pool.query(`SELECT to_char(s.slot,'HH24:MI') AS slot FROM unnest($3::time[]) s(slot)
    WHERE NOT EXISTS (SELECT 1 FROM booking b
      LEFT JOIN LATERAL (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC,rl.id_riwayat DESC LIMIT 1) ls ON true
      WHERE b.id_capster=$1 AND b.id_booking<>$2 AND b.tanggal_booking=$4::date
        AND b.status_booking NOT IN ('dibatalkan','customer terlambat','tidak_hadir')
        AND coalesce(ls.status_layanan,'belum dimulai') NOT IN ('dibatalkan','customer terlambat')
        AND (b.jam_mulai,b.jam_selesai) OVERLAPS (s.slot,s.slot+make_interval(mins=>$5)))
    ORDER BY s.slot`,[capsterId,id,slots,date,current.rows[0].duration]);
  res.json({slots:rows.map(row=>row.slot)});
}));
app.patch('/api/internal/bookings/:id/service-status', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id),status=String(req.body?.status||'');
  const allowed=['belum dimulai','layanan dimulai','layanan selesai','dibatalkan','customer terlambat'];
  if(!Number.isSafeInteger(id)||id<1||!allowed.includes(status)) return fail(res,400,'Status layanan tidak valid.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows}=await client.query(`SELECT b.id_booking,b.id_capster,b.status_booking,
      coalesce(ls.status_layanan,'belum dimulai') AS latest_status FROM booking b
      LEFT JOIN LATERAL (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC,rl.id_riwayat DESC LIMIT 1) ls ON true
      WHERE b.id_booking=$1 FOR UPDATE OF b`,[id]);
    const booking=rows[0]; if(!booking){await client.query('ROLLBACK');return fail(res,404,'Booking tidak ditemukan.');}
    const prev=booking.latest_status;
    if(status==='layanan dimulai'&&(!['belum dimulai','menunggu layanan','menunggu'].includes(prev)||booking.status_booking==='dibatalkan'||booking.status_booking==='customer terlambat')) throw Object.assign(new Error('Booking ini tidak dapat dimulai dari status saat ini.'),{status:409});
    if(status==='layanan selesai'&&prev!=='layanan dimulai') throw Object.assign(new Error('Layanan harus dimulai sebelum diselesaikan.'),{status:409});
    if(status==='dibatalkan'&&['layanan dimulai','layanan selesai'].includes(prev)) throw Object.assign(new Error('Layanan yang sudah dimulai tidak dapat dibatalkan.'),{status:409});
    if(status==='customer terlambat'&&['layanan dimulai','layanan selesai','dibatalkan'].includes(prev)) throw Object.assign(new Error('Status terlambat hanya bisa digunakan sebelum layanan dimulai.'),{status:409});
    if(status==='belum dimulai'&&!['customer terlambat','belum dimulai','menunggu layanan','menunggu'].includes(prev)) throw Object.assign(new Error('Status layanan yang sudah berjalan tidak dapat dikembalikan.'),{status:409});
    if(status==='dibatalkan') await client.query("UPDATE booking SET status_booking='dibatalkan' WHERE id_booking=$1",[id]);
    else if(status==='customer terlambat') await client.query("UPDATE booking SET status_booking='customer terlambat' WHERE id_booking=$1",[id]);
    else if(status==='belum dimulai') await client.query("UPDATE booking SET status_booking='dikonfirmasi' WHERE id_booking=$1",[id]);
    await client.query('INSERT INTO riwayat_layanan(id_booking,id_capster,status_layanan,waktu_status,catatan) VALUES($1,$2,$3,now(),$4)',[id,booking.id_capster,status,status==='dibatalkan'?'DP yang sudah dibayar hangus sesuai kebijakan pembatalan.':null]);
    await audit(req.user.id,`status layanan booking menjadi ${status}`,'booking',id,client);
    await client.query('COMMIT'); res.json({ok:true,status_layanan:status,status_booking:status==='dibatalkan'?'dibatalkan':status==='customer terlambat'?'customer terlambat':booking.status_booking});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.post('/api/internal/bookings/:id/reschedule', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id),capsterId=Number(req.body?.capsterId),date=String(req.body?.date||''),time=String(req.body?.time||'');
  const slots=['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','19:00','20:00'];
  if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(capsterId)||capsterId<1||!isoDate(date)||!slots.includes(time)) return fail(res,400,'Tanggal, jam, atau capster baru tidak valid.');
  if(isoDate(date)<isoDate(jakartaTodayString())) return fail(res,400,'Jadwal baru tidak boleh berada di masa lalu.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[String(capsterId),date]);
    const {rows}=await client.query(`SELECT b.id_booking,b.id_customer,b.kode_booking,b.total_harga,b.id_capster,b.tanggal_booking,b.jam_mulai,b.jam_selesai,
      (extract(epoch FROM (b.jam_selesai-b.jam_mulai))/60)::int AS duration,
      coalesce(ls.status_layanan,'belum dimulai') AS latest_status FROM booking b
      LEFT JOIN LATERAL (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC,rl.id_riwayat DESC LIMIT 1) ls ON true
      WHERE b.id_booking=$1 FOR UPDATE OF b`,[id]);
    const booking=rows[0]; if(!booking){await client.query('ROLLBACK');return fail(res,404,'Booking tidak ditemukan.');}
    if(booking.latest_status!=='customer terlambat') throw Object.assign(new Error('Tandai customer terlambat sebelum mengubah jadwal.'),{status:409});
    const barber=await client.query('SELECT c.id_capster FROM capster c JOIN pengguna u ON u.id_pengguna=c.id_pengguna WHERE c.id_capster=$1 AND c.status_aktif=true AND c.tersedia=true AND u.status_aktif=true AND u.deleted_at IS NULL',[capsterId]);
    if(!barber.rowCount) throw Object.assign(new Error('Capster tidak tersedia untuk booking.'),{status:409});
    const conflict=await client.query(`SELECT b.id_booking FROM booking b LEFT JOIN LATERAL
      (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC,rl.id_riwayat DESC LIMIT 1) ls ON true
      WHERE b.id_capster=$1 AND b.id_booking<>$2 AND b.tanggal_booking=$3::date AND b.status_booking NOT IN ('dibatalkan','customer terlambat','tidak_hadir')
        AND coalesce(ls.status_layanan,'belum dimulai') NOT IN ('dibatalkan','customer terlambat')
        AND (b.jam_mulai,b.jam_selesai) OVERLAPS ($4::time,$4::time+make_interval(mins=>$5)) LIMIT 1`,[capsterId,id,date,time,booking.duration]);
    if(conflict.rowCount) throw Object.assign(new Error('Slot tersebut baru saja terisi. Pilih jadwal kosong lainnya.'),{status:409});
    await client.query(`UPDATE booking SET id_capster=$2,tanggal_booking=$3::date,jam_mulai=$4::time,jam_selesai=$4::time+make_interval(mins=>$5),status_booking='dikonfirmasi' WHERE id_booking=$1`,[id,capsterId,date,time,booking.duration]);
    await client.query("INSERT INTO riwayat_layanan(id_booking,id_capster,status_layanan,waktu_status,catatan) VALUES($1,$2,'belum dimulai',now(),'Jadwal diubah oleh admin setelah customer terlambat.')",[id,capsterId]);
    await audit(req.user.id,'booking dijadwalkan ulang','booking',id,client); await client.query('COMMIT'); res.json({ok:true});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.post('/api/internal/bookings/:id/payments', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id),amount=Number(req.body?.amount),method=String(req.body?.paymentMethod||'').trim();
  if(!Number.isSafeInteger(id)||id<1||!Number.isFinite(amount)||amount<=0||!['Tunai','QRIS','Transfer Bank'].includes(method)) return fail(res,400,'Nominal dan metode pembayaran wajib valid.');
  const client=await pool.connect(); let notification=null;
  try {
    await client.query('BEGIN');
    const {rows}=await client.query(`SELECT b.id_booking,b.id_customer,b.id_capster,b.kode_booking,b.total_harga,b.tanggal_booking,b.jam_mulai,c.nama_customer,c.no_whatsapp,cp.nama_capster,
      coalesce((SELECT string_agg(l.nama_layanan,', ' ORDER BY l.nama_layanan) FROM booking_layanan bl JOIN layanan l ON l.id_layanan=bl.id_layanan WHERE bl.id_booking=b.id_booking),'') AS layanan
      FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN capster cp ON cp.id_capster=b.id_capster WHERE b.id_booking=$1 FOR UPDATE OF b`,[id]);
    const booking=rows[0]; if(!booking){await client.query('ROLLBACK');return fail(res,404,'Booking tidak ditemukan.');}
    if(booking.status_booking==='dibatalkan') throw Object.assign(new Error('Booking dibatalkan; pembayaran lanjutan tidak dapat dicatat.'),{status:409});
    const paidBefore=await client.query("SELECT coalesce(sum(nominal),0) AS total FROM pembayaran WHERE id_booking=$1 AND lower(status_pembayaran) IN ('success','verified','terverifikasi','berhasil','dibayar','paid','lunas')",[id]);
    const before=money(paidBefore.rows[0].total),balance=Math.max(0,money(booking.total_harga)-before);
    if(amount>balance) throw Object.assign(new Error(`Nominal melebihi sisa tagihan ${balance}.`),{status:400});
    await client.query("INSERT INTO pembayaran(id_booking,jenis_pembayaran,metode_pembayaran,nominal,status_pembayaran,waktu_bayar) VALUES($1,$2,$3,$4,'dibayar',now())",[id,before===0?'dp':'pelunasan',method,amount]);
    const paid=before+amount,isPaid=paid>=money(booking.total_harga);
    const trx=await client.query(`INSERT INTO transaksi(kode_transaksi,jenis_transaksi,id_booking,id_customer,id_capster,id_pengguna,total_tagihan,total_dibayar,status_transaksi,status_layanan,metode_pembayaran,created_at,waktu_lunas)
      VALUES($1,'booking',$2,$3,$4,$5,$6,$7,$8,'belum dimulai',$9,now(),CASE WHEN $7::numeric >= $6::numeric THEN now() ELSE NULL END)
      ON CONFLICT(id_booking) DO UPDATE SET total_dibayar=EXCLUDED.total_dibayar,status_transaksi=EXCLUDED.status_transaksi,metode_pembayaran=EXCLUDED.metode_pembayaran,waktu_lunas=coalesce(transaksi.waktu_lunas,EXCLUDED.waktu_lunas)
      RETURNING id_transaksi`,[`TRX-${booking.kode_booking}`,id,booking.id_customer,booking.id_capster,req.user.id,booking.total_harga,paid,isPaid?'lunas':'belum',method]);
    if(isPaid) {
      const invoice=`INV-${booking.kode_booking}`;
      await client.query(`INSERT INTO invoice(id_booking,id_transaksi,nomor_invoice,tanggal_terbit,total_tagihan) VALUES($1,$2,$3,current_date,$4)
        ON CONFLICT(id_booking) DO UPDATE SET id_transaksi=EXCLUDED.id_transaksi,total_tagihan=EXCLUDED.total_tagihan`,[id,trx.rows[0].id_transaksi,invoice,booking.total_harga]);
      if(before<money(booking.total_harga)) {
        const {rows:noticeRows}=await client.query(`INSERT INTO notifikasi_whatsapp(id_booking,no_tujuan,jenis_pesan,status_kirim) VALUES($1,$2,'invoice','menunggu') RETURNING id_notifikasi`,[id,booking.no_whatsapp]);
        notification={id:noticeRows[0].id_notifikasi,number:booking.no_whatsapp,message:invoiceMessage({invoice,code:booking.kode_booking,name:booking.nama_customer,service:booking.layanan,barber:booking.nama_capster,date:booking.tanggal_booking,time:booking.jam_mulai,total:booking.total_harga,paid})};
      }
    }
    await audit(req.user.id,'pembayaran booking dicatat','booking',id,client); await client.query('COMMIT');
    const whatsapp=notification?await sendInvoiceWhatsApp({notificationId:notification.id,number:notification.number,message:notification.message}):null;
    res.status(201).json({ok:true,total_dibayar:paid,status_pembayaran:isPaid?'lunas':'belum',sisa:Math.max(0,money(booking.total_harga)-paid),whatsapp});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.get('/api/internal/transactions', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT t.id_transaksi,t.kode_transaksi,t.jenis_transaksi,t.total_tagihan,t.total_dibayar,t.status_transaksi,t.status_layanan,t.metode_pembayaran,t.uang_diterima,t.kembalian,t.waktu_lunas,t.created_at,
            c.nama_customer,c.no_whatsapp,cp.nama_capster,u.nama_lengkap AS kasir,notice.status_kirim AS status_notifikasi,
            string_agg(coalesce(l.nama_layanan,tl.nama_layanan_snapshot), ', ' ORDER BY coalesce(l.nama_layanan,tl.nama_layanan_snapshot)) AS layanan
       FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN capster cp ON cp.id_capster=t.id_capster
       LEFT JOIN pengguna u ON u.id_pengguna=t.id_pengguna LEFT JOIN transaksi_layanan tl ON tl.id_transaksi=t.id_transaksi
       LEFT JOIN layanan l ON l.id_layanan=tl.id_layanan LEFT JOIN LATERAL (SELECT n.status_kirim FROM notifikasi_whatsapp n WHERE n.id_transaksi=t.id_transaksi ORDER BY n.id_notifikasi DESC LIMIT 1) notice ON true
       WHERE t.jenis_transaksi='walk-in'
       GROUP BY t.id_transaksi,c.nama_customer,c.no_whatsapp,cp.nama_capster,u.nama_lengkap,notice.status_kirim
      ORDER BY t.created_at DESC LIMIT 200`);
  res.json({ transactions: rows });
}));
app.post('/api/internal/transactions/walk-in', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const customerName = String(req.body?.customerName || '').trim();
  const whatsapp = String(req.body?.whatsapp || '').trim();
  const capsterId = Number(req.body?.capsterId);
  const serviceIds = Array.isArray(req.body?.serviceIds) ? [...new Set(req.body.serviceIds.map(Number).filter(Number.isInteger))] : [];
  const method = String(req.body?.paymentMethod || '').trim();
  const cashReceived=method==='Tunai'?Number(req.body?.cashReceived||0):0;
  if (!customerName || !/^\+?[0-9]{8,16}$/.test(whatsapp) || !Number.isInteger(capsterId) || !serviceIds.length || !['Tunai','QRIS','Transfer Bank'].includes(method) || !Number.isFinite(cashReceived)||cashReceived<0) return fail(res, 400, 'Nama, nomor WhatsApp, capster, layanan, dan metode pembayaran wajib valid.');
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
    const capster = await client.query('SELECT c.id_capster FROM capster c JOIN pengguna u ON u.id_pengguna=c.id_pengguna WHERE c.id_capster=$1 AND c.status_aktif=true AND c.tersedia=true AND u.status_aktif=true AND u.deleted_at IS NULL', [capsterId]);
    if (!capster.rowCount) throw Object.assign(new Error('Capster tidak tersedia untuk transaksi.'), { status: 400 });
    const total = services.rows.reduce((sum, service) => sum + money(service.harga), 0);
    const trx = await client.query(
      `INSERT INTO transaksi(kode_transaksi,jenis_transaksi,id_customer,id_capster,id_pengguna,total_tagihan,total_dibayar,status_transaksi,status_layanan,metode_pembayaran,uang_diterima,kembalian,created_at)
       VALUES('TRX-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,6)),'walk-in',$1,$2,$3,$4,0,'belum','menunggu',$5,$6,greatest($6::numeric-$4::numeric,0::numeric),now()) RETURNING id_transaksi,kode_transaksi`,
      [customer.rows[0].id_customer,capsterId,req.user.id,total,method,cashReceived]);
    for (const service of services.rows) await client.query(
      'INSERT INTO transaksi_layanan(id_transaksi,id_layanan,nama_layanan_snapshot,harga_satuan,subtotal) VALUES($1,$2,$3,$4,$4)',
      [trx.rows[0].id_transaksi,service.id_layanan,service.nama_layanan,service.harga]);
    await client.query('INSERT INTO riwayat_layanan(id_transaksi,id_capster,status_layanan,waktu_status,catatan) VALUES($1,$2,\'menunggu layanan\',now(),$3)',
      [trx.rows[0].id_transaksi,capsterId,`Walk-in ${trx.rows[0].kode_transaksi}`]);
    await audit(req.user.id,'transaksi walk-in dibuat','transaksi',trx.rows[0].id_transaksi,client);
    await client.query('COMMIT');
    res.status(201).json({ transaction: trx.rows[0], total, cash_received:cashReceived, change:Math.max(0,cashReceived-total), status_pembayaran:'belum' });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
app.post('/api/internal/transactions/:id/pay', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id),method=String(req.body?.paymentMethod||'').trim();
  if(!Number.isSafeInteger(id)||id<1||!['Tunai','QRIS','Transfer Bank'].includes(method)) return fail(res,400,'Transaksi dan metode pembayaran tidak valid.');
  const cashReceived=method==='Tunai'?Number(req.body?.cashReceived):0;
  if(!Number.isFinite(cashReceived)||cashReceived<0) return fail(res,400,'Jumlah uang tunai tidak valid.');
  const client=await pool.connect(); let notification=null;
  try {
    await client.query('BEGIN');
    const {rows}=await client.query(`SELECT t.id_transaksi,t.kode_transaksi,t.id_customer,t.total_tagihan,t.total_dibayar,t.status_transaksi,t.metode_pembayaran,
      t.uang_diterima,c.nama_customer,c.no_whatsapp,cp.nama_capster FROM transaksi t JOIN customer c ON c.id_customer=t.id_customer
      LEFT JOIN capster cp ON cp.id_capster=t.id_capster WHERE t.id_transaksi=$1 AND t.jenis_transaksi='walk-in' FOR UPDATE OF t`,[id]);
    const trx=rows[0]; if(!trx){await client.query('ROLLBACK');return fail(res,404,'Transaksi tidak ditemukan.');}
    if(money(trx.total_dibayar)>=money(trx.total_tagihan)) {await client.query('ROLLBACK');return res.json({ok:true,status_pembayaran:'lunas',whatsapp:null});}
    if(method==='Tunai'&&cashReceived<money(trx.total_tagihan)) throw Object.assign(new Error(`Uang diterima harus minimal Rp${new Intl.NumberFormat('id-ID').format(money(trx.total_tagihan))} untuk menandai lunas.`),{status:400});
    const serviceResult=await client.query(`SELECT string_agg(nama_layanan_snapshot,', ' ORDER BY nama_layanan_snapshot) AS layanan FROM transaksi_layanan WHERE id_transaksi=$1`,[id]);
    trx.layanan=serviceResult.rows[0]?.layanan||'';
    const change=method==='Tunai'?cashReceived-money(trx.total_tagihan):0;
    await client.query("UPDATE transaksi SET total_dibayar=total_tagihan,status_transaksi='lunas',metode_pembayaran=$2,uang_diterima=$3,kembalian=$4,waktu_lunas=now() WHERE id_transaksi=$1",[id,method,method==='Tunai'?cashReceived:0,change]);
    const invoice=`INV-${trx.kode_transaksi}`;
    await client.query('INSERT INTO invoice(id_transaksi,nomor_invoice,tanggal_terbit,total_tagihan) VALUES($1,$2,current_date,$3) ON CONFLICT(id_transaksi) DO UPDATE SET nomor_invoice=EXCLUDED.nomor_invoice,total_tagihan=EXCLUDED.total_tagihan',[id,invoice,trx.total_tagihan]);
    const {rows:noticeRows}=await client.query("INSERT INTO notifikasi_whatsapp(id_transaksi,no_tujuan,jenis_pesan,status_kirim) VALUES($1,$2,'invoice','menunggu') RETURNING id_notifikasi",[id,trx.no_whatsapp]);
    notification={id:noticeRows[0].id_notifikasi,number:trx.no_whatsapp,message:invoiceMessage({invoice,code:trx.kode_transaksi,name:trx.nama_customer,service:trx.layanan,barber:trx.nama_capster,total:trx.total_tagihan,paid:trx.total_tagihan})};
    await audit(req.user.id,'transaksi walk-in dilunasi','transaksi',id,client); await client.query('COMMIT');
    const whatsapp=await sendInvoiceWhatsApp({notificationId:notification.id,number:notification.number,message:notification.message});
    res.json({ok:true,status_pembayaran:'lunas',kembalian:change,whatsapp});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.post('/api/internal/invoices/:source/:id/whatsapp', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const source=String(req.params.source),id=Number(req.params.id);
  if(!['booking','transaction'].includes(source)||!Number.isSafeInteger(id)||id<1) return fail(res,400,'Invoice tidak valid.');
  const query=source==='booking'
    ? `SELECT b.kode_booking AS code,i.nomor_invoice AS invoice,c.nama_customer,c.no_whatsapp,cp.nama_capster,b.tanggal_booking AS date,b.jam_mulai AS time,b.total_harga AS total,
        coalesce((SELECT string_agg(l.nama_layanan,', ' ORDER BY l.nama_layanan) FROM booking_layanan bl JOIN layanan l ON l.id_layanan=bl.id_layanan WHERE bl.id_booking=b.id_booking),'') AS service,
        coalesce((SELECT sum(p.nominal) FROM pembayaran p WHERE p.id_booking=b.id_booking AND lower(p.status_pembayaran) IN ('success','verified','terverifikasi','berhasil','dibayar','paid','lunas')),0) AS paid
       FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN capster cp ON cp.id_capster=b.id_capster JOIN invoice i ON i.id_booking=b.id_booking WHERE b.id_booking=$1`
    : `SELECT t.kode_transaksi AS code,i.nomor_invoice AS invoice,c.nama_customer,c.no_whatsapp,cp.nama_capster,t.total_tagihan AS total,t.total_dibayar AS paid,
        string_agg(tl.nama_layanan_snapshot,', ' ORDER BY tl.nama_layanan_snapshot) AS service
       FROM transaksi t JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN capster cp ON cp.id_capster=t.id_capster JOIN invoice i ON i.id_transaksi=t.id_transaksi LEFT JOIN transaksi_layanan tl ON tl.id_transaksi=t.id_transaksi WHERE t.id_transaksi=$1 GROUP BY t.id_transaksi,i.nomor_invoice,c.nama_customer,c.no_whatsapp,cp.nama_capster`;
  const {rows}=await pool.query(query,[id]); const invoice=rows[0];
  if(!invoice) return fail(res,404,'Invoice tidak ditemukan.');
  if(money(invoice.paid)<money(invoice.total)) return fail(res,409,'Invoice baru dapat dikirim setelah status pembayaran lunas.');
  const {rows:notices}=await pool.query(`INSERT INTO notifikasi_whatsapp(${source==='booking'?'id_booking':'id_transaksi'},no_tujuan,jenis_pesan,status_kirim) VALUES($1,$2,'invoice','menunggu') RETURNING id_notifikasi`,[id,invoice.no_whatsapp]);
  const status=await sendInvoiceWhatsApp({notificationId:notices[0].id_notifikasi,number:invoice.no_whatsapp,message:invoiceMessage({invoice:invoice.invoice,code:invoice.code,name:invoice.nama_customer,service:invoice.service,barber:invoice.nama_capster,date:invoice.date,time:invoice.time,total:invoice.total,paid:invoice.paid})});
  await audit(req.user.id,'invoice dikirim ulang melalui WhatsApp',source,id);
  res.json({ok:true,whatsapp:status});
}));

app.get('/api/internal/services', requireDb, allInternal, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(req.user.role==='capster'
    ? 'SELECT id_layanan,nama_layanan,deskripsi,durasi_menit,status_aktif FROM layanan ORDER BY nama_layanan'
    : 'SELECT id_layanan,nama_layanan,deskripsi,harga,durasi_menit,status_aktif FROM layanan ORDER BY nama_layanan');
  res.json({ services: rows });
}));
app.get('/api/capsters/available', requireDb, asyncRoute(async (req,res) => {
  const {rows}=await pool.query(`SELECT c.id_capster,c.nama_capster,c.spesialisasi,c.foto,c.slug
    FROM capster c JOIN pengguna u ON u.id_pengguna=c.id_pengguna
    WHERE c.status_aktif=true AND c.tersedia=true AND u.status_aktif=true AND u.deleted_at IS NULL ORDER BY c.nama_capster`);
  res.json({capsters:rows});
}));
app.get('/api/internal/capsters', requireDb, adminOwner, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT c.id_capster,c.id_pengguna,c.nama_capster,c.spesialisasi,c.status_aktif,c.tersedia,u.status_aktif AS akun_aktif,(u.deleted_at IS NULL) AS akun_terdaftar FROM capster c JOIN pengguna u ON u.id_pengguna=c.id_pengguna ORDER BY c.nama_capster'); res.json({ capsters: rows });
}));
app.patch('/api/internal/capsters/:id/availability', requireDb, adminOwner, asyncRoute(async (req,res) => {
  const id=Number(req.params.id); const available=req.body?.tersedia;
  if(!Number.isSafeInteger(id)||id<1||typeof available!=='boolean') return fail(res,400,'ID capster dan status tersedia wajib valid.');
  const {rows}=await pool.query(`UPDATE capster c SET tersedia=$2 FROM pengguna u
    WHERE c.id_capster=$1 AND c.id_pengguna=u.id_pengguna AND c.status_aktif=true AND u.status_aktif=true AND u.deleted_at IS NULL
    RETURNING c.id_capster,c.nama_capster,c.tersedia`,[id,available]);
  if(!rows[0]) return fail(res,404,'Capster aktif tidak ditemukan.');
  await audit(req.user.id,available?'capster ditandai tersedia':'capster ditandai tidak tersedia','capster',id);
  res.json({capster:rows[0]});
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
app.delete('/api/internal/services/:id', requireDb, ownerOnly, asyncRoute(async (req,res) => {
  const id=Number(req.params.id); if(!Number.isSafeInteger(id)||id<1) return fail(res,400,'ID layanan tidak valid.');
  const refs=await pool.query('SELECT EXISTS(SELECT 1 FROM booking_layanan WHERE id_layanan=$1) OR EXISTS(SELECT 1 FROM transaksi_layanan WHERE id_layanan=$1) AS used',[id]);
  if(refs.rows[0].used) return fail(res,409,'Layanan sudah dipakai di transaksi atau booking. Nonaktifkan lewat Edit agar riwayat tetap utuh.');
  const result=await pool.query('DELETE FROM layanan WHERE id_layanan=$1',[id]);
  if(!result.rowCount) return fail(res,404,'Layanan tidak ditemukan.');
  await audit(req.user.id,'layanan dihapus','layanan',id); res.json({ok:true});
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
       LEFT JOIN layanan l ON l.id_layanan=bl.id_layanan WHERE b.id_capster=$1 AND b.tanggal_booking >= ${dateToday} AND b.status_booking NOT IN ('dibatalkan','selesai','tidak_hadir','customer terlambat')
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
      await client.query("UPDATE booking SET status_booking='customer terlambat' WHERE id_booking=$1", [id]);
      await client.query("INSERT INTO riwayat_layanan(id_booking,id_capster,status_layanan,waktu_status,catatan) VALUES($1,$2,'customer terlambat',now(),'Pelanggan terlambat; booking menunggu reschedule admin.')",[id,req.user.capsterId]);
      await audit(req.user.id,'customer terlambat - booking menunggu reschedule','booking',id,client);
    } else {
      const target = action === 'start' ? 'layanan dimulai' : 'layanan selesai';
      if (action === 'start' && !activeStatuses.includes(rows[0].status_booking)) throw Object.assign(new Error('Booking belum terkonfirmasi atau tidak dapat dimulai.'), { status: 409 });
      if (action === 'start' && ['layanan dimulai','layanan selesai'].includes(rows[0].latest_service_status)) throw Object.assign(new Error('Progres layanan booking ini sudah dimulai atau selesai.'),{status:409});
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
  const { rows } = await pool.query(`SELECT u.id_pengguna,u.nama_lengkap,u.email,u.role,u.status_aktif,c.id_capster,c.nama_capster,c.spesialisasi,c.foto,c.slug
    FROM pengguna u LEFT JOIN capster c ON c.id_pengguna=u.id_pengguna WHERE u.role IN ('admin','capster','owner') AND u.deleted_at IS NULL ORDER BY u.role,u.nama_lengkap`);
  res.json({ staff: rows });
}));
app.post('/api/internal/staff', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const name = String(req.body?.name || '').trim(); const email = String(req.body?.email || '').trim().toLowerCase(); const password = String(req.body?.password || ''); const role = String(req.body?.role || '');
  if (!name || !email || password.length < 10 || !['admin','capster','owner'].includes(role)) return fail(res, 400, 'Nama, email, password minimal 10 karakter, dan role owner/admin/capster wajib valid.');
  const specialization = String(req.body?.specialization || '').trim() || null;
  let photo; try { photo=capsterPhoto(req.body?.photo); } catch(error) { return fail(res,400,error.message); }
  const slug = String(req.body?.slug || '').trim().toLowerCase() || null; const active = role === 'capster' ? req.body?.active : true;
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail(res,400,'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.');
  if (typeof active !== 'boolean') return fail(res,400,'Status aktif capster wajib dipilih.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO pengguna(nama_lengkap,email,password_hash,role,status_aktif) VALUES($1,$2,$3,$4,$5) RETURNING id_pengguna,nama_lengkap,email,role,status_aktif', [name,email,await bcrypt.hash(password,12),role,active]);
    if (role === 'capster') await client.query('INSERT INTO capster(id_pengguna,nama_capster,spesialisasi,foto,slug,status_aktif) VALUES($1,$2,$3,$4,$5,$6)', [rows[0].id_pengguna,name,specialization,photo,slug,active]);
    await audit(req.user.id,'akun staf dibuat','pengguna',rows[0].id_pengguna,client);
    await client.query('COMMIT'); res.status(201).json({ user: rows[0] });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.patch('/api/internal/staff/:id', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const id=Number(req.params.id); const name=String(req.body?.name||'').trim(); const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||'');
  const active=req.body?.active; const specialization=String(req.body?.specialization||'').trim()||null; let photo; try { photo=capsterPhoto(req.body?.photo); } catch(error) { return fail(res,400,error.message); } const slug=String(req.body?.slug||'').trim().toLowerCase()||null;
  if(!Number.isSafeInteger(id)||id<1||!name||!email||typeof active!=='boolean') return fail(res,400,'Nama, email, dan status aktif wajib valid.');
  if(password&&password.length<10) return fail(res,400,'Password baru minimal 10 karakter.');
  if(slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail(res,400,'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query("SELECT id_pengguna,role FROM pengguna WHERE id_pengguna=$1 AND deleted_at IS NULL AND role IN ('admin','capster') FOR UPDATE",[id]);
    if(!found.rows[0]) { await client.query('ROLLBACK'); return fail(res,404,'Akun staf tidak ditemukan.'); }
    const staffRole=found.rows[0].role;
    const result=password
      ? await client.query('UPDATE pengguna SET nama_lengkap=$2,email=$3,password_hash=$4,status_aktif=$5 WHERE id_pengguna=$1 RETURNING id_pengguna,nama_lengkap,email,role,status_aktif',[id,name,email,await bcrypt.hash(password,12),active])
      : await client.query('UPDATE pengguna SET nama_lengkap=$2,email=$3,status_aktif=$4 WHERE id_pengguna=$1 RETURNING id_pengguna,nama_lengkap,email,role,status_aktif',[id,name,email,active]);
    if(staffRole==='capster') {
      await client.query('UPDATE capster SET nama_capster=$2,spesialisasi=$3,foto=$4,slug=$5,status_aktif=$6 WHERE id_pengguna=$1',[id,name,specialization,photo,slug,active]);
    }
    await audit(req.user.id,active?'akun staf diperbarui':'akun staf dinonaktifkan','pengguna',id,client);
    await client.query('COMMIT'); res.json({user:result.rows[0]});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.patch('/api/internal/staff/:id/restore', requireDb, ownerOnly, asyncRoute(async (req,res) => {
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1) return fail(res,400,'ID akun tidak valid.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const result=await client.query("UPDATE pengguna SET status_aktif=true,deleted_at=NULL WHERE id_pengguna=$1 AND role='capster' RETURNING id_pengguna,nama_lengkap,email,role,status_aktif",[id]);
    if(!result.rows[0]) { await client.query('ROLLBACK'); return fail(res,404,'Akun capster tidak ditemukan.'); }
    await client.query('UPDATE capster SET status_aktif=true WHERE id_pengguna=$1',[id]);
    await audit(req.user.id,'akun capster dipulihkan dan diaktifkan','pengguna',id,client);
    await client.query('COMMIT'); res.json({user:result.rows[0]});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
app.delete('/api/internal/staff/:id', requireDb, ownerOnly, asyncRoute(async (req,res) => {
  const id=Number(req.params.id); if(!Number.isSafeInteger(id)||id<1) return fail(res,400,'ID akun tidak valid.');
  if(id===Number(req.user.id)) return fail(res,400,'Akun yang sedang digunakan tidak dapat dihapus.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query("SELECT id_pengguna,role FROM pengguna WHERE id_pengguna=$1 AND deleted_at IS NULL AND role IN ('admin','capster','owner') FOR UPDATE",[id]);
    if(!found.rows[0]) { await client.query('ROLLBACK'); return fail(res,404,'Akun staf tidak ditemukan.'); }
    if(found.rows[0].role==='owner') {
      const ownerCount=await client.query("SELECT count(*)::int AS count FROM pengguna WHERE role='owner' AND status_aktif=true AND deleted_at IS NULL");
      if(ownerCount.rows[0].count<=1) { await client.query('ROLLBACK'); return fail(res,409,'Owner aktif terakhir tidak dapat dihapus.'); }
    }
    await client.query("UPDATE pengguna SET status_aktif=false,deleted_at=now() WHERE id_pengguna=$1",[id]);
    await client.query('UPDATE capster SET status_aktif=false WHERE id_pengguna=$1',[id]);
    await audit(req.user.id,'akun staf dihapus','pengguna',id,client);
    await client.query('COMMIT'); res.json({ok:true});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
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
  const { rows } = await pool.query(`SELECT g.id_galeri,g.judul,g.kategori,g.file_gambar,g.id_capster,c.nama_capster,g.created_at
    FROM galeri g LEFT JOIN capster c ON c.id_capster=g.id_capster ORDER BY g.created_at DESC`); res.json({ gallery: rows });
}));
app.post('/api/internal/gallery', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const title = String(req.body?.title || '').trim(); const category=String(req.body?.category||'').trim(); const capsterId=Number(req.body?.capsterId); let image; try { image=galleryImage(req.body?.image); } catch(error) { return fail(res,400,error.message); }
  if (!title || !category || !image || !Number.isSafeInteger(capsterId) || capsterId<1) return fail(res,400,'Judul, kategori, capster, dan gambar wajib diisi.');
  const capster=await pool.query('SELECT id_capster FROM capster WHERE id_capster=$1',[capsterId]); if(!capster.rows[0]) return fail(res,400,'Capster tidak ditemukan.');
  const { rows } = await pool.query('INSERT INTO galeri(id_pengguna,judul,kategori,file_gambar,id_capster,created_at) VALUES($1,$2,$3,$4,$5,now()) RETURNING *',[req.user.id,title,category,image,capsterId]); await audit(req.user.id,'item galeri dibuat','galeri',rows[0].id_galeri); res.status(201).json({ item: rows[0] });
}));
app.patch('/api/internal/gallery/:id', requireDb, ownerOnly, asyncRoute(async (req,res) => {
  const id=Number(req.params.id); const title=String(req.body?.title||'').trim(); const category=String(req.body?.category||'').trim(); const capsterId=Number(req.body?.capsterId); let image=null;
  if(req.body?.image!=null) { try { image=galleryImage(req.body.image); } catch(error) { return fail(res,400,error.message); } }
  if(!Number.isSafeInteger(id)||id<1||!title||!category||!Number.isSafeInteger(capsterId)||capsterId<1) return fail(res,400,'ID, judul, kategori, dan capster wajib valid.');
  const capster=await pool.query('SELECT id_capster FROM capster WHERE id_capster=$1',[capsterId]); if(!capster.rows[0]) return fail(res,400,'Capster tidak ditemukan.');
  const {rows}=await pool.query('UPDATE galeri SET judul=$2,kategori=$3,id_capster=$4,file_gambar=coalesce($5,file_gambar) WHERE id_galeri=$1 RETURNING *',[id,title,category,capsterId,image]);
  if(!rows[0]) return fail(res,404,'Item galeri tidak ditemukan.');
  await audit(req.user.id,'item galeri diperbarui','galeri',id); res.json({item:rows[0]});
}));
app.delete('/api/internal/gallery/:id', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const id=Number(req.params.id); const result = await pool.query('DELETE FROM galeri WHERE id_galeri=$1',[id]); if (!result.rowCount) return fail(res,404,'Item galeri tidak ditemukan.'); await audit(req.user.id,'item galeri dihapus','galeri',id); res.json({ ok:true });
}));
app.get('/api/internal/reports', requireDb, ownerOnly, asyncRoute(async (req, res) => {
  const granularity=String(req.query.granularity||'custom');
  const range=reportBounds(granularity,String(req.query.anchor||jakartaTodayString()),String(req.query.start||''),String(req.query.end||''));
  if(!range) return fail(res,400,'Filter periode tidak valid.');
  const {start,end,bucket}=range;
  const incomeQuery=`
    SELECT to_char(p.waktu_bayar AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS tanggal,b.kode_booking AS referensi,
           'Booking online'::text AS sumber,c.nama_customer,cp.id_capster,cp.nama_capster,p.metode_pembayaran AS metode,
           p.nominal AS nominal,p.status_pembayaran AS status,
           coalesce((SELECT string_agg(l.nama_layanan,', ' ORDER BY l.nama_layanan) FROM booking_layanan bl JOIN layanan l ON l.id_layanan=bl.id_layanan WHERE bl.id_booking=b.id_booking),'') AS layanan,
           'pembayaran'::text AS jenis_sumber
      FROM pembayaran p JOIN booking b ON b.id_booking=p.id_booking LEFT JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN capster cp ON cp.id_capster=b.id_capster
     WHERE lower(p.status_pembayaran) IN ('success','verified','berhasil','dibayar','paid','lunas') AND p.waktu_bayar IS NOT NULL
       AND (p.waktu_bayar AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
    UNION ALL
    SELECT to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD'),b.kode_booking,'Booking online',c.nama_customer,cp.id_capster,cp.nama_capster,t.metode_pembayaran,
           t.total_dibayar,t.status_transaksi,
           coalesce((SELECT string_agg(tl.nama_layanan_snapshot,', ' ORDER BY tl.nama_layanan_snapshot) FROM transaksi_layanan tl WHERE tl.id_transaksi=t.id_transaksi),'') ,'transaksi-booking'
      FROM transaksi t JOIN booking b ON b.id_booking=t.id_booking LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN capster cp ON cp.id_capster=t.id_capster
     WHERE t.jenis_transaksi='booking' AND t.total_dibayar>0 AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
       AND NOT EXISTS (SELECT 1 FROM pembayaran p WHERE p.id_booking=b.id_booking AND lower(p.status_pembayaran) IN ('success','verified','berhasil','dibayar','paid','lunas'))
    UNION ALL
    SELECT to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD'),t.kode_transaksi,'Walk-in',c.nama_customer,cp.id_capster,cp.nama_capster,t.metode_pembayaran,
           t.total_dibayar,t.status_transaksi,
           coalesce((SELECT string_agg(tl.nama_layanan_snapshot,', ' ORDER BY tl.nama_layanan_snapshot) FROM transaksi_layanan tl WHERE tl.id_transaksi=t.id_transaksi),'') ,'transaksi-walkin'
      FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN capster cp ON cp.id_capster=t.id_capster
     WHERE t.jenis_transaksi='walk-in' AND t.total_dibayar>0 AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
     ORDER BY 1,2`;
  const [incomeResult,expenseResult,transactionResult,bookingResult,servedResult,serviceResult,outstandingResult,profileResult]=await Promise.all([
    pool.query(incomeQuery,[start,end]),
    pool.query(`SELECT to_char(tanggal_pengeluaran,'YYYY-MM-DD') AS tanggal,kategori,deskripsi,nominal,id_pengeluaran FROM pengeluaran WHERE tanggal_pengeluaran BETWEEN $1::date AND $2::date ORDER BY tanggal_pengeluaran,id_pengeluaran`,[start,end]),
    pool.query(`SELECT t.id_transaksi,t.kode_transaksi,t.jenis_transaksi,t.id_customer,t.id_capster,t.total_tagihan,t.total_dibayar,t.status_transaksi,t.status_layanan,t.metode_pembayaran,
                       to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS tanggal,c.nama_customer,cp.nama_capster,
                       coalesce((SELECT string_agg(tl.nama_layanan_snapshot,', ' ORDER BY tl.nama_layanan_snapshot) FROM transaksi_layanan tl WHERE tl.id_transaksi=t.id_transaksi),'') AS layanan
                  FROM transaksi t LEFT JOIN customer c ON c.id_customer=t.id_customer LEFT JOIN capster cp ON cp.id_capster=t.id_capster
                 WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date ORDER BY t.created_at,t.id_transaksi`,[start,end]),
    pool.query(`SELECT b.id_booking,b.kode_booking,b.id_customer,b.total_harga,b.nominal_dp,b.status_booking,b.tanggal_booking::text AS tanggal,
                       c.nama_customer,cp.id_capster,cp.nama_capster,
                       coalesce(last_service.status_layanan,'belum dimulai') AS status_layanan,
                       coalesce((SELECT string_agg(l.nama_layanan,', ' ORDER BY l.nama_layanan) FROM booking_layanan bl JOIN layanan l ON l.id_layanan=bl.id_layanan WHERE bl.id_booking=b.id_booking),'') AS layanan
                  FROM booking b JOIN customer c ON c.id_customer=b.id_customer LEFT JOIN capster cp ON cp.id_capster=b.id_capster
                  LEFT JOIN LATERAL (SELECT rl.status_layanan FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC LIMIT 1) last_service ON true
                 WHERE b.tanggal_booking BETWEEN $1::date AND $2::date ORDER BY b.tanggal_booking,b.jam_mulai`,[start,end]),
    pool.query(`WITH completed_booking AS (
                  SELECT b.id_capster,b.id_customer,to_char(last_service.waktu_status AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS tanggal
                    FROM booking b JOIN LATERAL (SELECT rl.status_layanan,rl.waktu_status FROM riwayat_layanan rl WHERE rl.id_booking=b.id_booking ORDER BY rl.waktu_status DESC LIMIT 1) last_service ON last_service.status_layanan='layanan selesai'
                   WHERE (last_service.waktu_status AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
                ), completed_walkin AS (
                  SELECT t.id_capster,t.id_customer,to_char(t.created_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS tanggal FROM transaksi t
                   WHERE t.jenis_transaksi='walk-in' AND t.status_layanan='selesai' AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
                ) SELECT x.id_capster,c.nama_capster,x.tanggal,count(*)::int AS pelanggan FROM (SELECT * FROM completed_booking UNION ALL SELECT * FROM completed_walkin) x
                    JOIN capster c ON c.id_capster=x.id_capster GROUP BY x.id_capster,c.nama_capster,x.tanggal ORDER BY x.tanggal,c.nama_capster`,[start,end]),
    pool.query(`SELECT tl.nama_layanan_snapshot AS nama_layanan,count(*)::int AS jumlah,sum(tl.subtotal)::numeric AS pendapatan
                  FROM transaksi_layanan tl JOIN transaksi t ON t.id_transaksi=tl.id_transaksi
                 WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
                 GROUP BY tl.nama_layanan_snapshot ORDER BY pendapatan DESC,tl.nama_layanan_snapshot`,[start,end]),
    pool.query(`SELECT
       coalesce((SELECT sum(greatest(t.total_tagihan-t.total_dibayar,0)) FROM transaksi t WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date),0)
       + coalesce((SELECT sum(greatest(b.total_harga-coalesce(p.terbayar,0),0)) FROM booking b
             LEFT JOIN (SELECT id_booking,sum(nominal) AS terbayar FROM pembayaran WHERE lower(status_pembayaran) IN ('success','verified','berhasil','dibayar','paid','lunas') GROUP BY id_booking) p ON p.id_booking=b.id_booking
            WHERE b.tanggal_booking BETWEEN $1::date AND $2::date AND b.status_booking NOT IN ('dibatalkan','tidak_hadir')
              AND NOT EXISTS (SELECT 1 FROM transaksi t WHERE t.id_booking=b.id_booking)),0) AS outstanding`,[start,end]),
    pool.query('SELECT nama_usaha,alamat,no_kontak FROM profil_usaha ORDER BY id_profil DESC LIMIT 1'),
  ]);
  const incomeRows=incomeResult.rows.map(row=>({...row,nominal:money(row.nominal)}));
  const expenseRows=expenseResult.rows.map(row=>({...row,nominal:money(row.nominal)}));
  const transactions=transactionResult.rows.map(row=>({...row,total_tagihan:money(row.total_tagihan),total_dibayar:money(row.total_dibayar)}));
  const bookings=bookingResult.rows.map(row=>({...row,total_harga:money(row.total_harga),nominal_dp:money(row.nominal_dp)}));
  const servedRows=servedResult.rows.map(row=>({...row,pelanggan:Number(row.pelanggan)}));
  const revenue=incomeRows.reduce((sum,row)=>sum+row.nominal,0); const expenses=expenseRows.reduce((sum,row)=>sum+row.nominal,0);
  const normalizedStatus=(value)=>String(value||'').toLowerCase().replaceAll('_',' ').trim();
  const canceledBookings=bookings.filter(row=>['dibatalkan','cancelled','canceled'].includes(normalizedStatus(row.status_booking))).length;
  const noShowBookings=bookings.filter(row=>['tidak hadir','no show','noshow'].includes(normalizedStatus(row.status_booking))).length;
  const completedBookings=bookings.filter(row=>normalizedStatus(row.status_layanan)==='layanan selesai'||normalizedStatus(row.status_booking)==='selesai').length;
  const customerIds=new Set([...bookings.map(row=>row.id_customer),...transactions.map(row=>row.id_customer)].filter(value=>value!=null).map(String));
  const totalBilled=transactions.reduce((sum,row)=>sum+row.total_tagihan,0);
  const incomeBySource=new Map();const paymentBreakdown=new Map();
  for(const row of incomeRows){incomeBySource.set(row.sumber,(incomeBySource.get(row.sumber)||0)+row.nominal);const method=row.metode_pembayaran||'Tidak dicatat';paymentBreakdown.set(method,(paymentBreakdown.get(method)||0)+row.nominal);}
  const expenseBreakdown=new Map();for(const row of expenseRows)expenseBreakdown.set(row.kategori,(expenseBreakdown.get(row.kategori)||0)+row.nominal);
  const servicePerformance=serviceResult.rows.map(row=>({...row,jumlah:Number(row.jumlah),pendapatan:money(row.pendapatan)}));
  const capsterMap=new Map();
  for(const row of servedRows){const key=String(row.id_capster);const item=capsterMap.get(key)||{id_capster:row.id_capster,nama_capster:row.nama_capster,pelanggan:0,pendapatan:0,estimasi_pendapatan:0};item.pelanggan+=row.pelanggan;item.estimasi_pendapatan+=100000+10000*row.pelanggan;capsterMap.set(key,item);}
  for(const row of incomeRows)if(row.nama_capster){const item=capsterMap.get(String(row.id_capster))||{nama_capster:row.nama_capster,pelanggan:0,pendapatan:0,estimasi_pendapatan:0};item.pendapatan+=row.nominal;capsterMap.set(String(row.id_capster||row.nama_capster),item);}
  const previousDays=Math.max(1,Math.round((isoDate(end)-isoDate(start))/86400000)+1);const previousEnd=new Date(isoDate(start));previousEnd.setUTCDate(previousEnd.getUTCDate()-1);const previousStart=new Date(previousEnd);previousStart.setUTCDate(previousStart.getUTCDate()-previousDays+1);
  const previousBounds=[dateString(previousStart),dateString(previousEnd)];
  const [previousIncome,previousExpenses]=await Promise.all([
    pool.query(incomeQuery,previousBounds),pool.query('SELECT coalesce(sum(nominal),0) AS total FROM pengeluaran WHERE tanggal_pengeluaran BETWEEN $1::date AND $2::date',previousBounds),
  ]);
  const previousRevenue=previousIncome.rows.reduce((sum,row)=>sum+money(row.nominal),0);const previousExpenseTotal=money(previousExpenses.rows[0].total);
  const activityBuckets=new Map();
  const ensureBucket=(day)=>{const key=bucketStart(day,bucket);if(!activityBuckets.has(key))activityBuckets.set(key,{bucket_start:key,pendapatan:0,pengeluaran:0,transaksi:0,booking:0});return activityBuckets.get(key);};
  for(const row of incomeRows)ensureBucket(row.tanggal).pendapatan+=row.nominal;
  for(const row of expenseRows)ensureBucket(row.tanggal).pengeluaran+=row.nominal;
  for(const row of transactions)ensureBucket(row.tanggal).transaksi++;
  for(const row of bookings)ensureBucket(row.tanggal).booking++;
  for(let day=bucketStart(start,bucket);day<=end;day=addBucket(day,bucket))ensureBucket(day);
  const timeline=[...activityBuckets.values()].sort((a,b)=>a.bucket_start.localeCompare(b.bucket_start)).map(row=>({...row,selisih:row.pendapatan-row.pengeluaran}));
  res.json({report:{filters:{granularity,anchor:String(req.query.anchor||jakartaTodayString()),start,end,bucket,comparisonStart:previousBounds[0],comparisonEnd:previousBounds[1]},business:profileResult.rows[0]||null,
    summary:{pendapatan:revenue,pengeluaran:expenses,selisih_operasional:revenue-expenses,jumlah_transaksi:transactions.length,jumlah_booking:bookings.length,booking_selesai:completedBookings,booking_dibatalkan:canceledBookings,booking_tidak_hadir:noShowBookings,pelanggan_unik:customerIds.size,rata_rata_tagihan:transactions.length?totalBilled/transactions.length:0,tagihan_belum_lunas:money(outstandingResult.rows[0].outstanding)},
    comparison:{pendapatan:previousRevenue,pengeluaran:previousExpenseTotal,selisih_operasional:previousRevenue-previousExpenseTotal},timeline,
    sumber_pendapatan:[...incomeBySource].map(([sumber,nominal])=>({sumber,nominal})),metode_pembayaran:[...paymentBreakdown].map(([metode_pembayaran,nominal])=>({metode_pembayaran,nominal})),
    pengeluaran_per_kategori:[...expenseBreakdown].map(([kategori,nominal])=>({kategori,nominal})).sort((a,b)=>b.nominal-a.nominal),service_performance:servicePerformance,
    capster_performance:[...capsterMap.values()].sort((a,b)=>b.pelanggan-a.pelanggan||b.pendapatan-a.pendapatan),income_rows:incomeRows,expense_rows:expenseRows,transactions,bookings,served:servedRows
  }});
}));
app.post('/api/internal/reports/export', requireDb, ownerOnly, asyncRoute(async (req,res) => {
  const granularity=String(req.body?.granularity||'custom');const range=reportBounds(granularity,String(req.body?.anchor||jakartaTodayString()),String(req.body?.start||''),String(req.body?.end||''));const format=String(req.body?.format||'');
  if(!range||!['csv','pdf'].includes(format)) return fail(res,400,'Periode atau format ekspor tidak valid.');
  const {start,end}=range;const filters=JSON.stringify({granularity,anchor:req.body?.anchor||null,comparison:req.body?.comparison||'previous-equal-period'});
  const {rows}=await pool.query('INSERT INTO laporan(id_pengguna,jenis_laporan,periode_mulai,periode_selesai,format_ekspor,granularitas,parameter_filter,created_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now()) RETURNING id_laporan',[req.user.id,'laporan-keuangan-operasional',start,end,format,granularity,filters]);
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
