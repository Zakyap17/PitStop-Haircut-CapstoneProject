# Memasang di VM (home server)

Rencana: database di PostgreSQL hosted (Neon/Supabase), backend dan web di satu VM Linux.
Kamera Try-On hanya jalan lewat **HTTPS**, jadi web perlu alamat HTTPS (lihat langkah 6).

## 1. Database (sekali saja)

1. Buat project di [Neon](https://neon.tech) atau [Supabase](https://supabase.com), wilayah Singapore.
2. Salin connection string (Neon: *Connection string*; Supabase: *Connect* → pooler, mode transaction).
3. Simpan, ini akan jadi `DATABASE_URL`. Jangan di-commit.

Tabel dibuat otomatis oleh backend saat pertama start (migrasi), termasuk data awal layanan dan kapster.

## 2. Siapkan VM

Ubuntu/Debian dengan akses internet. Pasang Node.js 22 dan git:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
```

## 3. Ambil kode

```bash
git clone https://github.com/Zakyap17/PitStop-Haircut-CapstoneProject.git
cd PitStop-Haircut-CapstoneProject
```

## 4. Backend

```bash
cd backend
npm install --omit=dev
cp .env.example .env
nano .env     # isi DATABASE_URL=..., dan TRUST_PROXY=1 bila ada reverse proxy
NODE_ENV=production pm2 start src/index.js --name pitstop-backend
pm2 logs pitstop-backend --lines 20      # harus ada "migrasi dijalankan" lalu "berjalan di ..."
curl http://localhost:4000/api/health     # {"status":"ok",...,"database":"pg"}
```

`database: "pg"` artinya terhubung ke PostgreSQL sungguhan. Kalau tertulis `pglite`, `DATABASE_URL` belum terbaca.

## 5. Web (frontend)

```bash
cd ../frontend
npm install
cp .env.example .env.local     # BACKEND_URL=http://localhost:4000
npm run build
pm2 start npm --name pitstop-web -- start
pm2 save && pm2 startup        # jalan otomatis setelah VM restart (ikuti perintah yang dicetak)
```

Web di http://IP-VM:3000. Browser tidak pernah memanggil backend langsung: semua lewat `/api/...` di web
yang diteruskan ke `BACKEND_URL`, jadi port 4000 **tidak perlu** dibuka ke luar VM.

`npm run build` mengunduh font dari Google, jadi VM harus punya internet saat build.

## 6. HTTPS (wajib untuk kamera Try-On di HP)

Pilih salah satu:

- **Tailscale Funnel/Serve** (kamu sudah pakai Tailscale): `sudo tailscale serve --bg 3000` memberi alamat
  `https://nama-vm.tailnet.ts.net` yang hanya bisa dibuka perangkat di tailnet-mu. `tailscale funnel 3000`
  membukanya untuk umum (cocok untuk penguji di luar tailnet). Aktifkan HTTPS di admin console Tailscale dulu.
- **Cloudflare Tunnel**: alamat publik HTTPS tanpa membuka port router.

Setelah alamatnya jadi, isi `NEXT_PUBLIC_SITE_URL` di `frontend/.env.local` dengan alamat itu, lalu build ulang.

## 7. Update setelah ada perubahan kode

```bash
cd PitStop-Haircut-CapstoneProject && git pull
cd backend && npm install --omit=dev && pm2 restart pitstop-backend     # migrasi baru jalan otomatis
cd ../frontend && npm install && npm run build && pm2 restart pitstop-web
```

## Pemeriksaan cepat sebelum testing

- [ ] `curl http://localhost:4000/api/health` menjawab `"database":"pg"`
- [ ] Buka web, daftar layanan dan kapster tampil (artinya web berhasil membaca backend)
- [ ] Buat satu reservasi dari HP, lalu buka Cek Reservasi dari perangkat lain: harus ketemu
- [ ] Buat reservasi kedua di jam dan kapster yang sama dari perangkat lain: kapster harus tampil "Penuh"
- [ ] `pm2 status` menunjukkan `pitstop-backend` dan `pitstop-web` berstatus online

## Kalau ada masalah

| Gejala | Penyebab umum |
|---|---|
| Web menampilkan halaman "Ban-nya bocor" | Web tidak bisa menghubungi backend. Cek `BACKEND_URL` dan `pm2 status`. |
| `database: "pglite"` di health | `DATABASE_URL` kosong atau `.env` tidak terbaca. Restart pm2 setelah mengubah `.env`. |
| Backend gagal start dengan error SSL/koneksi | Connection string salah, atau Neon belum bangun dari idle (coba lagi). |
| Pengguna terkena batas percobaan (429) padahal baru sedikit | Backend melihat semua pengunjung sebagai satu IP (proxy Next). Naikkan `RATE_LIMIT_WRITE` dan `RATE_LIMIT_ACCESS` di `backend/.env`, lalu `pm2 restart pitstop-backend`. |
