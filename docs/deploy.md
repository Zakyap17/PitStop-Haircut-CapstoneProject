# Menjalankan Pit Stop dengan Docker

Satu `docker compose` menjalankan web (customer + internal), **dua API terpisah**, dan (opsional) Cloudflare Tunnel. Database tetap di Supabase.

API dipisah dari satu image yang sama supaya gangguan di salah satunya tidak menjatuhkan yang lain: kalau API internal macet (laporan berat, unggah foto besar), reservasi dan OTP pelanggan tetap jalan, dan sebaliknya.

```
                                    ┌─ /api/internal/* ──> internal (Express :4001)  Admin, Capster, Owner ─┐
Internet ──> Cloudflare Tunnel ──> web (Next.js :3000)                                                         ├──> Supabase
                                    └─ /api/*          ──> api      (Express :4000)  reservasi, OTP, riwayat ─┘
```

Hanya `web` yang punya port ke luar. `api` dan `internal` tidak bisa dicapai langsung dari jaringan; semua lewat proxy `/api` milik web (aturan `/api/internal` dicocokkan lebih dulu). Nomor port 4000/4001 hanya berlaku di dalam jaringan Docker dan bebas diganti (ubah `PORT`, lalu `BACKEND_URL` dan `INTERNAL_BACKEND_URL` di `docker-compose.yml`).

## Isi folder

| Berkas | Fungsi |
|---|---|
| `docker-compose.yml` | Mendefinisikan service `api`, `internal`, `web`, dan `tunnel` (profile `public`) |
| `backend/Dockerfile` | Satu image untuk kedua API; peran dipilih lewat `SERVICE=public` atau `SERVICE=internal` |
| `frontend/Dockerfile` | Image web (Next.js `standalone`, user non-root) |
| `.env` (dari `.env.example`) | Port, alamat situs, token tunnel |
| `backend/.env` | Rahasia backend: database, WhatsApp, AI, `JWT_SECRET` |
| `scripts/setup.sh`, `scripts/setup.ps1` | Menyiapkan `.env` dan `backend/.env` (JWT_SECRET otomatis) |
| `scripts/backup-db.sh` | Cadangan database ke `cadangan/*.sql.gz` |

## Pertama kali

Prasyarat: Docker Engine + Compose v2 (Linux) atau Docker Desktop (Windows/Mac), dan `DATABASE_URL` dari pemegang proyek.

1. Ambil kode: `git clone -b deploy https://github.com/Zakyap17/PitStop-Haircut-CapstoneProject.git && cd PitStop-Haircut-CapstoneProject`
2. Siapkan berkas `.env`: `./scripts/setup.sh` (Windows PowerShell: `powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1`).
   Skrip membuat `.env` dan `backend/.env` dari contohnya, mengisi `JWT_SECRET` secara acak, dan tidak menimpa berkas yang sudah ada.
3. Isi `DATABASE_URL` di `backend/.env`, lalu jalankan skrip tadi sekali lagi (ia berhenti sampai nilainya ada).
   Isian lain di `backend/.env` yang biasanya diubah:
   - `FRONTEND_ORIGIN` harus memuat **alamat yang dipakai di browser** (contoh `https://pitstop.contoh.com,http://192.168.8.118:3000`). Kalau tidak, login dan aksi tulis web internal ditolak 403.
   - `WHATSAPP_PROVIDER=fonnte` dan `FONNTE_TOKEN` untuk mengirim WhatsApp sungguhan. Bawaan `console` hanya mencetak pesan (termasuk kode OTP) di `docker compose logs -f api`.
   - `PUBLIC_WEB_URL` (tautan di pesan WhatsApp) dan `TRYON_*` bila fitur try-on dipakai.
   - `TRUST_PROXY`: di belakang tunnel dan proxy web ada dua lompatan. Coba `2`, lalu cek bahwa batas percobaan per IP tidak menganggap semua pengunjung satu orang.
4. Variabel Compose di `.env`: isi `SITE_URL` (alamat publik) dan `TUNNEL_TOKEN` bila memakai tunnel.
5. Migrasi database (hanya jika ada migrasi baru, lihat bagian Migrasi): lewati kalau Supabase sudah sama dengan kode.
6. Nyalakan:
   ```
   docker compose up -d --build                    # hanya akses lokal / jaringan rumah
   docker compose --profile public up -d --build   # plus tunnel ke internet
   ```
7. Cek: `docker compose ps` (kolom STATUS harus `healthy`) dan buka `http://localhost:3000`.

Build pertama mengunduh font Google dan dependensi, jadi butuh internet dan memori sekitar 2 GB bebas. Kalau build web gagal sesaat karena unduhan font, ulangi `docker compose up -d --build`.

### Cloudflare Tunnel (sekali saja)
1. Dashboard Cloudflare > Zero Trust > Networks > Tunnels > buat tunnel > pilih Docker, salin **token** ke `TUNNEL_TOKEN` di `.env`.
2. Tambah *Public Hostname*: domainmu -> Service `HTTP` `web:3000`.
3. Pastikan domain itu ada di `FRONTEND_ORIGIN` (`backend/.env`) dan `SITE_URL` (`.env`), lalu `docker compose --profile public up -d --build`.

### Membuka dari HP di jaringan rumah (tanpa tunnel)
Isi `WEB_BIND=0.0.0.0` di `.env`, jalankan ulang `docker compose up -d`, buka `http://IP-SERVER:3000`, dan tambahkan alamat itu ke `FRONTEND_ORIGIN`.

## Dev lokal tanpa Docker

`npm run dev` / `npm start` di `backend/` menjalankan **kedua API dalam satu proses** (`SERVICE=all`, bawaan) di port 4000, dan web memakainya untuk semua `/api`. Untuk meniru pemisahan: jalankan dua proses dengan `SERVICE=public PORT=4000` dan `SERVICE=internal PORT=4001`, lalu jalankan web dengan `INTERNAL_BACKEND_URL=http://localhost:4001`.

## Pembayaran online (opsional)

Isi `MIDTRANS_SERVER_KEY` (kunci sandbox untuk uji) di `backend/.env`, lalu `docker compose up -d api`. Tanpa itu e-tiket hanya menawarkan transfer manual.
Agar konfirmasi masuk otomatis, daftarkan `https://<domain-publik>/api/payments/midtrans/notification` sebagai Payment Notification URL di dashboard Midtrans
(alamat ini lewat proxy web ke container `api`). Detail alur dan keamanan: [docs/pembayaran.md](pembayaran.md).

## Sehari-hari

| Perlu | Perintah |
|---|---|
| Status | `docker compose ps` |
| Log (mengikuti) | `docker compose logs -f api`, `internal`, atau `web` |
| Mulai ulang satu service | `docker compose restart internal` (yang lain tidak terganggu) |
| Berhenti semua | `docker compose down` (data aman, ada di Supabase) |
| Masuk ke container | `docker compose exec api sh` |

Log berputar otomatis (10 MB x 5 berkas per service). Semua service `restart: unless-stopped`, jadi hidup lagi setelah server restart.

## Update versi baru

```
git pull
docker compose up -d --build        # tambahkan --profile public kalau memakai tunnel
```
Compose hanya membuat ulang service yang berubah. Kalau ada migrasi baru, jalankan **sebelum** langkah di atas (bagian berikut).

Mengubah `SITE_URL` atau nama service `api` berarti membangun ulang `web` (`docker compose up -d --build web`), karena nilainya terkunci saat build.

## Migrasi database

Database dipakai bersama tim, jadi migrasi **tidak jalan otomatis**. Backend menolak start dan memberi tahu kalau ada migrasi milik web customer yang belum dijalankan.

```
docker compose run --rm api npm run migrate       # migrasi web customer (backend/migrations)
docker compose run --rm api npm run db:migrate    # migrasi web internal (backend/db/migrations)
# `run` memakai perintah baru, jadi tidak ikut menyalakan server di dalamnya.
```
Keduanya mencatat diri di tabel `schema_migrations` dengan nama berkas yang berbeda, jadi tidak bentrok. Cadangkan dulu sebelum migrasi yang mengubah struktur.

Akun owner pertama (sekali saja, isi `BOOTSTRAP_OWNER_*` di `backend/.env`, lalu hapus lagi):
```
docker compose run --rm api npm run db:bootstrap-owner
```

## Cadangan dan pemulihan

```
./scripts/backup-db.sh            # menghasilkan cadangan/pitstop-<waktu>.sql.gz, menyimpan 14 terakhir
```
Jadwalkan harian di server, contoh cron: `0 3 * * * cd /srv/PitStop && ./scripts/backup-db.sh`. Salin juga ke tempat lain (disk kedua atau cloud): cadangan berisi data pelanggan, jangan di-commit (folder `cadangan/` sebaiknya masuk `.gitignore`).

Pulihkan ke database kosong: `gunzip -c cadangan/<berkas>.sql.gz | psql "$DATABASE_URL"`. Uji pemulihan minimal sekali sebelum benar-benar bergantung padanya.

## Kembali ke versi sebelumnya

```
git log --oneline                  # cari commit yang masih baik
git checkout <commit>
docker compose up -d --build
```
Migrasi tidak ikut mundur. Karena itu migrasi dibuat hanya menambah (kolom/tabel baru), supaya kode lama tetap jalan di struktur baru.

## Pemecahan masalah

| Gejala | Penyebab umum |
|---|---|
| `api` terus restart, log: "Ada N migrasi belum dijalankan" | Jalankan `npm run migrate` (di atas) |
| Login internal 403 "Origin tidak diizinkan" | Alamat browser belum ada di `FRONTEND_ORIGIN` |
| Login internal 503 | `JWT_SECRET` kosong atau database tidak terjangkau: `docker compose logs internal` |
| Halaman customer jalan tapi admin/owner error (atau sebaliknya) | Itu gunanya dipisah: cek container yang bermasalah saja (`docker compose ps`) dan `restart` yang itu |
| Web terbuka tapi reservasi gagal | `api` tidak sehat: `docker compose logs api` (cek `DATABASE_URL`) |
| Semua pengunjung terkena batas percobaan bersamaan | `TRUST_PROXY` belum sesuai jumlah lompatan |
| Perubahan `.env` web tidak berpengaruh | `SITE_URL` terkunci saat build: `docker compose up -d --build web` |
| OTP tidak sampai | `WHATSAPP_PROVIDER=fonnte`, `FONNTE_TOKEN`, dan perangkat Fonnte terhubung |

## Catatan keamanan
- `backend/.env` dan `.env` tidak masuk git dan tidak masuk image (`.dockerignore`); rahasia hanya masuk saat container berjalan.
- Container berjalan sebagai user non-root. `api` dan `internal` tidak membuka port ke luar.
- Container `api` tidak memuat kode rute internal sama sekali (hanya dimuat saat `SERVICE=internal` atau `all`).
- `cloudflare/cloudflared:latest` sebaiknya dikunci ke satu versi setelah stabil.
