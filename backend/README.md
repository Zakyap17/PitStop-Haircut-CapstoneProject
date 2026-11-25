# Backend Pit Stop

Express + PostgreSQL. Melayani web customer (katalog, jadwal kosong, reservasi) dan menyimpan data yang
dipakai bersama web internal (admin, capster, owner).

## Menjalankan

```bash
npm install
cp .env.example .env
npm run dev        # nodemon
npm test           # 32 tes otomatis, memakai database tertanam, tidak butuh PostgreSQL
npm run migrate    # menjalankan migrasi manual (juga otomatis saat server start)
```

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | PostgreSQL (Supabase / Neon). **Kosong = database tertanam PGlite**, hanya untuk dev. Wajib diisi kalau `NODE_ENV=production`. |
| `PGLITE_DIR` | Folder data database tertanam. Kosong = hilang saat server berhenti. |
| `PORT`, `HOST` | Port (4000) dan alamat yang didengarkan (`0.0.0.0`). |
| `CORS_ORIGINS` | Asal web yang boleh memanggil API langsung dari browser. Tidak wajib kalau web memakai proxy `/api` bawaan Next. |
| `TRUST_PROXY` | Isi `1` kalau ada reverse proxy di depan backend, supaya batas percobaan per IP benar. |
| `WHATSAPP_PROVIDER` | `console` (bawaan: pesan hanya dicetak di log, aman untuk dev) atau `fonnte` (kirim sungguhan). |
| `FONNTE_TOKEN` | Token perangkat dari dashboard Fonnte. Rahasia. Wajib kalau `WHATSAPP_PROVIDER=fonnte`. |
| `PUBLIC_WEB_URL` | Alamat publik web customer, untuk tautan cek/ubah di pesan WhatsApp. |
| `RATE_LIMIT_WRITE`, `RATE_LIMIT_ACCESS` | Batas percobaan per IP (bawaan 30/menit untuk membuat reservasi, 100/15 menit untuk cek/ubah/batal). Web memanggil backend lewat proxy Next, sehingga semua pengunjung bisa terlihat sebagai satu IP: naikkan kalau penguji saling terblokir. |

## Database

Skema ada di `migrations/` (SQL biasa, berurutan). Aturan:

- **Jangan mengubah migrasi yang sudah dijalankan.** Perubahan skema = file baru (`003_nama.sql`).
- Tabel: `settings`, `services`, `barbers`, `booking_slots`, `haircuts`, `testimonials`, `reservations`.
- `reservations` menyimpan salinan nama layanan, durasi, dan harga saat dipesan, jadi riwayat tidak berubah
  kalau menu diubah. `starts_at`/`ends_at` adalah **waktu setempat toko** (tanpa zona waktu, WIB).
- Status reservasi: `confirmed`, `completed`, `cancelled`, `no_show`. Kolom `source`: `online` atau `walk-in`.
- Pengaturan toko (jam buka/tutup, istirahat, berapa hari ke depan bisa dipesan, batas ubah jadwal, batas
  reservasi aktif per email) ada di tabel `settings` dan bisa diubah tanpa deploy ulang.
- Menu (layanan, kapster, gaya rambut, jam yang bisa dipesan, testimoni) diubah langsung di tabelnya.
  Jangan hapus baris yang sudah dipakai reservasi; nonaktifkan lewat `is_active = false`.
- Testimoni **sengaja kosong** sampai ada testimoni pelanggan asli. Selama kosong, bagian Testimoni di web disembunyikan.

### Untuk yang mengerjakan web internal (admin, capster, owner)

Pakai database yang sama. Hal yang perlu diperhatikan:

- Jangan membuat tabel baru yang menduplikasi `reservations`, `services`, `barbers`. Tambah kolom lewat migrasi baru.
- Reservasi walk-in: insert ke `reservations` dengan `source = 'walk-in'`. Penahan bentrok (indeks unik
  `reservations_barber_start_active`) berlaku juga untuk walk-in; cek tumpang tindih durasi sebaiknya memakai
  fungsi di `src/services/availability.js` supaya aturannya sama.
- Endpoint untuk admin (login, daftar reservasi, ubah status, transaksi) **belum ada**. Kalau mau dibuat di
  backend ini, tambahkan router baru di `src/routes/` dengan autentikasi sendiri; endpoint customer di bawah
  tidak memerlukan login.

## API customer

Semua balasan JSON. Error: `{ "error": { "code": "slot_taken", "message": "..." } }`.

| Endpoint | Fungsi |
|---|---|
| `GET /api/health` | Status server dan database |
| `GET /api/catalog` | Layanan, kapster, gaya rambut, testimoni, aturan reservasi |
| `GET /api/availability?date=YYYY-MM-DD&serviceId=...` | Untuk tiap jam: id kapster yang bisa melayani (kosong = penuh) |
| `POST /api/reservations` | Buat reservasi. Body: `serviceId, barberId, date, time, customerName, customerEmail, hairstyle?` |
| `POST /api/reservations/lookup` | Cek reservasi. Body: `code, email` |
| `POST /api/reservations/:code/reschedule` | Ubah jadwal. Body: `email, barberId, date, time` |
| `POST /api/reservations/:code/cancel` | Batalkan. Body: `email` |

Aturan yang ditegakkan server: jam buka dan tutup, istirahat, layanan harus selesai sebelum tutup, hari libur
kapster, tumpang tindih durasi, jam yang sudah lewat, jangkauan hari, batas ubah jadwal, batas 3 reservasi
aktif per email, dan batas percobaan per IP. Pemesanan serentak untuk slot yang sama diurutkan dengan kunci
database sehingga hanya satu yang berhasil. Kode atau email salah selalu dijawab "tidak ditemukan".

Pelanggan tidak punya akun: kode reservasi + email adalah kuncinya.

## WhatsApp otomatis

Pelanggan mengisi nomor WhatsApp saat reservasi (wajib). Pesan yang dikirim otomatis:

| Kapan | Pesan |
|---|---|
| Reservasi dibuat | **Invoice**: kode, nama, layanan, jadwal, kapster, gaya pilihan, total biaya, alamat, peta, tautan cek/ubah/batal |
| Jadwal diubah | Jadwal baru (kode tetap sama) |
| Dibatalkan | Konfirmasi pembatalan |
| `reminder_minutes_before` menit sebelum jadwal (bawaan 120) | Pengingat. Sekali per reservasi, dijadwalkan ulang kalau jadwal diubah, dilewati kalau jadwalnya sudah dekat saat dipesan |

Cara kerjanya: perubahan reservasi menulis pesan ke tabel `notifications` (antrean) dalam transaksi yang sama,
lalu worker di backend mengirimnya tiap 5 detik. Akibatnya pemesanan tidak pernah gagal gara-gara WhatsApp
bermasalah. Pesan yang gagal dicoba ulang dengan jeda 30 detik, 2 menit, 10 menit, 30 menit, lalu ditandai `failed`
setelah 5 percobaan (alasannya di kolom `last_error`). Status terlihat di e-tiket ("Invoice sudah dikirim ke WhatsApp
0812••••890"). Teks semua pesan ada di `src/notifications/templates.js`.

Memantau: `SELECT kind, recipient, status, attempts, last_error FROM notifications ORDER BY id DESC LIMIT 20;`

### Memasang Fonnte (penyedia WhatsApp)

1. Daftar di [fonnte.com](https://fonnte.com), tambah *Device*, lalu scan QR dengan WhatsApp **nomor toko**.
2. Salin *token* perangkat ke `FONNTE_TOKEN` di `backend/.env`, isi `WHATSAPP_PROVIDER=fonnte` dan `PUBLIC_WEB_URL`.
3. Restart backend. Log harus menulis `WhatsApp: penyedia fonnte`.
4. **Uji dulu ke nomormu sendiri**: buat satu reservasi dengan nomor sendiri, invoice harus masuk dalam beberapa detik.

Catatan penting: Fonnte bukan layanan resmi Meta. Pakai nomor khusus toko (bukan nomor pribadi), jangan kirim massal,
dan jaga perangkat di Fonnte tetap *connected* (status di dashboard). Kalau perangkat terputus, pesan tertahan di antrean
dan terkirim sendiri setelah tersambung lagi (selama belum melewati 5 percobaan). Format permintaan ke Fonnte sudah
sesuai dokumentasi dan diuji dengan penyedia tiruan, tetapi belum diuji dengan token Fonnte asli.

## Yang belum ada

- Pengiriman e-tiket lewat email (web tidak lagi mengklaim e-tiket dikirim ke email).
- Pembatalan otomatis kalau pelanggan tidak check-in 10 menit sebelum jadwal (aturan ini tertulis di web
  tapi belum dijalankan siapa pun; butuh pekerjaan terjadwal atau dilakukan kasir).
- Pembayaran. Harga di web adalah biaya layanan; tidak ada DP.
