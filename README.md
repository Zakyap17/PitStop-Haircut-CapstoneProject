# PitStop Haircut - Capstone Project

Aplikasi booking potong rambut. Monorepo berisi:

- `frontend/` - Next.js (TypeScript, Tailwind CSS)
- `backend/` - Express (Node.js)

## Cara cepat: jalankan semuanya dengan Docker

Butuh Docker (Docker Desktop di Windows/Mac) dan satu hal dari pemegang proyek: `DATABASE_URL` (alamat database Supabase).

```bash
git clone -b deploy https://github.com/Zakyap17/PitStop-Haircut-CapstoneProject.git
cd PitStop-Haircut-CapstoneProject

./scripts/setup.sh                 # Windows PowerShell: powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
# isi DATABASE_URL di backend/.env, jalankan ulang skrip di atas, lalu:
docker compose up -d --build
docker compose ps                  # tunggu api, internal, web = healthy
```
Buka http://localhost:3000 (web customer) dan http://localhost:3000/internal/login (Admin, Capster, Owner).
Dua API (customer dan internal) berjalan sebagai container terpisah. Panduan lengkap, update, migrasi, dan cadangan: [docs/deploy.md](docs/deploy.md).

## Menjalankan Project (tanpa Docker, untuk pengembangan)

### Backend (jalankan lebih dulu)
```bash
cd backend
npm install
cp .env.example .env     # DATABASE_URL kosong = memakai database tertanam (PGlite), cukup untuk dev
npm run dev
```
Berjalan di http://localhost:4000. Migrasi database dijalankan otomatis saat server start.
Detail API, database, dan tes ada di [backend/README.md](backend/README.md).

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Berjalan di http://localhost:3000. Tidak perlu berkas `.env`: web otomatis memakai backend di `http://localhost:4000`.
Kalau backend ada di alamat lain, buat `frontend/.env.local` berisi `BACKEND_URL=http://alamat-backend:4000`.
Halaman customer mengambil semua datanya (layanan, kapster, gaya rambut,
jadwal, reservasi) dari backend, jadi backend harus menyala.

Memasang di server (VM): lihat [docs/deploy-vm.md](docs/deploy-vm.md).

### Sistem Internal (Owner, Admin/Cashier, Capster)

1. Salin `backend/.env.example` ke `backend/.env`, lalu atur `DATABASE_URL`, `JWT_SECRET` (minimal 32 karakter), dan kredensial owner awal. Di production HTTPS, aktifkan `COOKIE_SECURE=true` dan sesuaikan `FRONTEND_ORIGIN`.
2. Jalankan migrasi database dari folder `backend`:

```bash
npm install
npm run db:migrate
npm run db:bootstrap-owner
npm run dev
```

3. Salin `frontend/.env.example` ke `frontend/.env.local`, lalu jalankan frontend seperti biasa.
4. Buka `http://localhost:3000/internal/login`. Setelah login, sistem mengarahkan setiap role ke dashboardnya.

Migrasi memakai PostgreSQL dan mencakup tabel internal sesuai `DB_STRUCTURE.md`, termasuk tambahan `transaksi` dan `transaksi_layanan` agar walk-in dapat ditagih tanpa booking serta invoice walk-in tetap tercatat. API internal tersedia di `/api/internal/*`; endpoint customer tidak ditambahkan atau diubah.

## Coba di HP (jaringan Wi-Fi yang sama)

```bash
cd frontend
npm run dev:lan
```

Perintah ini mencetak alamat seperti `http://192.168.x.x:3000`. Ketik alamat Wi-Fi itu di browser HP
(HP dan komputer harus di Wi-Fi yang sama). Abaikan alamat adapter virtual (VirtualBox, VPN/Tailscale).

**Kalau HP tidak bisa membuka**, Windows Firewall biasanya memblokir koneksi masuk. Buka PowerShell
**sebagai Administrator** lalu jalankan (hanya mengizinkan perangkat di jaringan lokal yang sama):

```powershell
New-NetFirewallRule -DisplayName "Next.js dev 3000 (jaringan lokal)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any -RemoteAddress LocalSubnet
```

Untuk menutupnya lagi setelah selesai: `Remove-NetFirewallRule -DisplayName "Next.js dev 3000 (jaringan lokal)"`.
Cara lain: saat Windows menanyakan akses untuk Node.js, centang jaringan yang dipakai (Private/Public).

**Kamera langsung di Try-On butuh HTTPS**, jadi lewat `http://192.168...` tombol "Nyalakan kamera" menampilkan
pesan dan tidak aktif. Tombol "Unggah foto" tetap bisa dipakai (HP menawarkan "Ambil foto"). Untuk menguji
kamera di HP, buka versi yang sudah di-deploy (HTTPS) atau pakai tunnel HTTPS; untuk tunnel, tambahkan domainnya
ke `allowedDevOrigins` di `frontend/next.config.mjs`.

## Kolaborasi

Untuk coding bareng secara real-time, gunakan extension **Live Share** di VS Code:
1. Install extension "Live Share" (Microsoft)
2. Buka folder ini di VS Code
3. Command Palette -> "Live Share: Start Collaboration Session"
4. Bagikan link yang muncul ke teman satu tim
