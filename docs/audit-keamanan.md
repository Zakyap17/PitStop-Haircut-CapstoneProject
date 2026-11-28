# Audit keamanan dan bug (28 November 2026)

Pemeriksaan menyeluruh atas web customer, API customer, API internal (Admin, Capster, Owner), pembayaran Midtrans, konfigurasi Docker, dependensi,
dan riwayat git. Metode: membaca kode (termasuk seluruh `backend/src/internal/router.js`), uji serangan langsung ke API lokal dengan database sementara
(bukan Supabase), uji pada stack Docker, `npm audit`, dan pemindaian riwayat git. Skrip serangannya tidak disimpan di repo; hasilnya dirangkum di sini.

Status: **Diperbaiki** (di branch `fix/security-hardening`), **Tindakan server** (perlu diisi di server), **Tim internal** (kode web internal; belum diubah), atau **Dicatat**.

## Temuan

### Tinggi
| # | Temuan | Bukti | Status |
|---|---|---|---|
| H1 | **Pembatas laju dipakai bersama semua pengunjung di belakang proxy.** Tanpa `TRUST_PROXY`, backend melihat semua orang sebagai satu IP, jadi satu orang yang melewati batas mengunci semua orang. | Diuji di Docker: 101 cek booking dari "klien" berbeda -> klien baru ikut `429`. 8 login internal gagal dari satu klien -> pemilik asli dari IP lain ikut `429` selama 15 menit. OTP per IP (20 per 10 menit) ikut terkena. Dengan `TRUST_PROXY=2` perilaku benar: klien terpisah tidak saling terkunci. | **Tindakan server**: isi `TRUST_PROXY` (2 dengan tunnel, 1 tanpa tunnel). Backend kini mencetak peringatan bila kosong; ada tes dan panduan di `docs/deploy.md`. |
| H2 | **Next.js 16.3.3 punya banyak advisory** (cache poisoning SSG/ISR pada self-host, response injection, DoS; ada yang bertingkat critical pada fitur yang tidak kita pakai: `next/og`, optimasi gambar SVG, `use cache`). | `npm audit --omit=dev` | **Diperbaiki**: Next 16.4.6. Audit produksi frontend sekarang 0. `shadcn` dipindah ke devDependencies (hanya dipakai saat build). |

### Sedang
| # | Temuan | Status |
|---|---|---|
| M1 | **Tidak ada header keamanan** di web: halaman login internal bisa dibenamkan di iframe situs lain (clickjacking), tanpa `nosniff`, `Referrer-Policy`, HSTS. | **Diperbaiki** di `next.config.mjs` (frame-ancestors/X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy dengan kamera hanya untuk situs sendiri, HSTS). CSP sengaja hanya arahan yang tidak merusak skrip Next. |
| M2 | **Login internal: pembatas hanya per IP dan di-memori.** Selain H1, penyerang dari banyak IP tidak dibatasi per akun, dan `Map` percobaan tidak pernah dibersihkan. Saran: kunci per `email` + IP, bersihkan entri kedaluwarsa. | **Tim internal** |
| M3 | **Login internal membocorkan keberadaan akun lewat waktu respons**: bcrypt hanya dijalankan bila email terdaftar. Saran: selalu jalankan `bcrypt.compare` terhadap hash palsu bila akun tidak ada. | **Tim internal** |
| M4 | **Cookie sesi `SameSite=None`** saat `COOKIE_SECURE=true`. Web dan API sama-asal lewat proxy, jadi `Lax` cukup dan lebih aman. Perlindungan CSRF kini hanya pemeriksaan header `Origin` (permintaan tanpa header `Origin` lolos). | **Tim internal** |
| M5 | **`/api/internal/capster/earnings` memakai angka tetap** (`100000 + jumlah pelanggan x 10000`), bukan data nyata. Pendapatan kapster yang tampil tidak mencerminkan transaksi. | **Tim internal** (bug data) |
| M6 | `body-parser` (DoS) dan `qs` di backend. | **Diperbaiki** (`body-parser` 2.4.0, `qs` 6.17.1). Audit backend 0. |

### Rendah
| # | Temuan | Status |
|---|---|---|
| L1 | **Karakter null (`\u0000`, `%00`) di isian apa pun menghasilkan 500** (PostgreSQL menolaknya). Dapat dipicu tanpa login (nama, kode, nomor, `/api/barbers/%00/photo`, query ketersediaan). | **Diperbaiki** untuk API customer (ditolak 400 sebelum ke database; ada tes). API internal belum. |
| L2 | API internal: id bukan angka (`Number('abc')` = `NaN`) lolos ke SQL dan menjadi 500 di beberapa rute (`PATCH /capster/bookings/:id/status`, `DELETE /gallery/:id`, dll.). Saran: validasi `Number.isSafeInteger(id) && id > 0` di semua rute. | **Tim internal** |
| L3 | Kode OTP tidak terikat tujuan: kode yang diminta untuk booking juga membuka riwayat nomor itu. Bukan eskalasi hak akses (penerima kode di WhatsApp memang pemilik nomor), tetapi tujuan tidak dipisah. | Dicatat |
| L4 | `WHATSAPP_PROVIDER=console` (bawaan contoh) mencetak kode OTP ke log. Hanya untuk dev; jangan dipakai di server produksi. | Dicatat (sudah di `.env.example`) |
| L5 | Header `X-Powered-By: Next.js` membocorkan teknologi. | **Diperbaiki** (`poweredByHeader: false`) |
| L6 | Frontend berpindah ke `redirectUrl` dari server tanpa pemeriksaan. | **Diperbaiki**: hanya `https` ke `*.midtrans.com`. |
| L7 | CORS API customer mengizinkan semua asal (tanpa cookie, jadi rendah). Batasi lewat `CORS_ORIGINS` bila mau. | Dicatat |
| L8 | Status booking tidak konsisten di API internal: kapster menandai `customer terlambat`, sedangkan `queue-return` hanya menerima `tidak_hadir`, jadi alur masuk antrean ulang tidak pernah tercapai dari tanda kapster. | **Tim internal** (bug logika) |
| L9 | `console.error(err)` di penanganan galat internal bisa mencetak detail data pribadi (mis. detail kunci duplikat) ke log. | **Tim internal** |
| L10 | Booking yang tidak dibayar menahan slot selama 2 jam (batas DP). Dibatasi OTP dan tiga booking aktif per nomor, tetapi penyerang dengan banyak nomor bisa menahan banyak slot. | Dicatat |

## Yang diuji dan aman
- **Akses data orang lain (IDOR/enumerasi):** booking hanya terbuka dengan kode **dan** nomor pemilik; kode salah dan nomor salah dijawab identik dengan waktu respons sama; batal, ubah jadwal, dan bayar dengan nomor lain ditolak; nomor parsial dan wildcard (`%`) ditolak.
- **Tebak kode booking:** dibatasi `429`. **OTP:** sekali pakai, terikat nomor (kode nomor A tidak berlaku untuk B), terkunci setelah 5 tebakan salah (kode benar pun tidak berlaku), jeda 60 detik, 3 per 10 menit per nomor, dan batas per IP.
- **Race condition:** 12 booking serentak di slot yang sama -> tepat satu berhasil. Satu nomor dibatasi tiga booking aktif.
- **Validasi:** tanggal lampau/jauh/tidak valid, jam bukan slot, jam istirahat/tutup, layanan dan kapster tidak ada, nama kosong atau 5000 huruf, nomor non-seluler: semuanya 4xx.
- **Mass-assignment:** `status`, `harga`, `dp`, `kode_booking`, `id_capster` kiriman klien diabaikan.
- **Injeksi:** 198 payload (SQL, NoSQL, prototype pollution, Unicode, nilai ekstrem) ke 11 endpoint: tidak ada 5xx maupun kebocoran stack/SQL. Seluruh query memakai parameter; dua interpolasi di API internal hanya konstanta atau daftar putih.
- **API internal:** tiap rute punya penjaga peran; kapster hanya melihat/mengubah miliknya (`id_capster` dari sesi); owner terkunci untuk staf, galeri, laporan; status akun dicek ulang ke database tiap permintaan; JWT tanpa tanda tangan, rahasia tebakan, atau acak ditolak 401; asal (`Origin`) asing ditolak 403 untuk permintaan tulis; unggahan gambar memeriksa jenis dan isi berkas (SVG ditolak).
- **Pembayaran:** webhook bertanda tangan palsu ditolak 403; status dibaca ulang dari Midtrans; nominal harus sama persis; webhook ganda aman; diuji dengan transaksi kartu sungguhan di sandbox.
- **Frontend:** tidak ada XSS sink selain JSON-LD yang di-escape; file kalender hanya memuat data dari server.
- **Rahasia:** riwayat git tidak memuat kredensial asli (hanya placeholder); `.env` tidak masuk image; semua container berjalan sebagai user non-root; port API tidak terbuka ke host.

## Daftar tindakan
1. **Server (segera):** isi `TRUST_PROXY` di `backend/.env` (2 dengan Cloudflare Tunnel), lalu `docker compose up -d api internal`.
2. Gabungkan `fix/security-hardening` ke `main`, lalu `git pull` dan `docker compose up -d --build` di server.
3. **Tim internal:** M2, M3, M4, M5, L2, L8, L9 (dan penjaga karakter null untuk API internal).
4. Setelah akun Midtrans milik sendiri dibuat dan dipakai di produksi: kunci produksi, `MIDTRANS_IS_PRODUCTION=true`, dan uji nominal kecil.
