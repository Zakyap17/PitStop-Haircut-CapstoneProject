# Backend Pit Stop

Express + PostgreSQL. Melayani web customer (katalog, jadwal kosong, booking dengan DP, pesan WhatsApp) dan menyimpan
data yang dipakai bersama web internal (admin, capster, owner).

Acuan skema dan perilaku: **ERD laporan** dan Use Case Diagram. Kesepakatan nilai status dan pembagian tugas antar
developer ada di [`docs/kontrak-data-dan-use-case.md`](../docs/kontrak-data-dan-use-case.md).

## Menjalankan

```bash
npm install
cp .env.example .env
npm run dev        # nodemon
npm test           # 37 tes otomatis, memakai database tertanam, tidak butuh PostgreSQL
npm run migrate    # menjalankan migrasi (WAJIB dijalankan sengaja untuk database bersama)
```

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | PostgreSQL (Supabase / Neon / VM). **Kosong = database tertanam PGlite**, hanya untuk dev. Wajib diisi kalau `NODE_ENV=production`. |
| `AUTO_MIGRATE` | Migrasi otomatis saat start hanya berlaku untuk database tertanam. Untuk database bersama, backend **berhenti** kalau ada migrasi belum jalan dan meminta `npm run migrate`. Isi `true` hanya kalau memang mau otomatis. |
| `PGLITE_DIR` | Folder data database tertanam. Kosong = hilang saat server berhenti. |
| `PORT`, `HOST` | Port (4000) dan alamat yang didengarkan (`0.0.0.0`). |
| `CORS_ORIGINS` | Asal web yang boleh memanggil API langsung dari browser. Tidak wajib kalau web memakai proxy `/api` bawaan Next. |
| `TRUST_PROXY` | Isi `1` kalau ada reverse proxy di depan backend, supaya batas percobaan per IP benar. |
| `WHATSAPP_PROVIDER` | `console` (bawaan: pesan hanya dicetak di log, aman untuk dev) atau `fonnte` (kirim sungguhan). |
| `FONNTE_TOKEN` | Token perangkat dari dashboard Fonnte. Rahasia. Wajib kalau `WHATSAPP_PROVIDER=fonnte`. |
| `PUBLIC_WEB_URL` | Alamat publik web customer, untuk tautan cek booking di pesan WhatsApp. |
| `RATE_LIMIT_WRITE`, `RATE_LIMIT_ACCESS` | Batas percobaan per IP (bawaan 30/menit untuk membuat booking, 100/15 menit untuk cek/ubah/batal). Web memanggil backend lewat proxy Next, sehingga semua pengunjung bisa terlihat sebagai satu IP: naikkan kalau penguji saling terblokir. |

> **Hati-hati dengan `.env` yang berisi database bersama dan token WhatsApp asli.** Menyalakan backend dengan `.env` itu
> mengirim WhatsApp sungguhan dan membaca/menulis data asli. Untuk uji coba lokal pakai
> `DATABASE_URL= WHATSAPP_PROVIDER=console FONNTE_TOKEN= node src/index.js`.

## Database

Skema ada di `migrations/` (SQL biasa, berurutan):

| File | Isi |
|---|---|
| `001`–`003` | Skema awal buatan web customer (sudah dipindahkan dan dihapus oleh 006; tetap ada sebagai riwayat) |
| `004_lock_public_api.sql` | Mengunci tabel dari API publik Supabase (Row Level Security) |
| `005_official_erd.sql` | **ERD resmi (19 tabel)**. Dilewati di database yang tabelnya sudah ada (Supabase), dibuat di database baru |
| `006_customer_web_on_official_erd.sql` | Menambah kolom untuk web customer, memindahkan data dari tabel lama, menghapus tabel dobel |

Aturan:

- **Jangan mengubah migrasi yang sudah dijalankan.** Perubahan skema = file baru (`007_nama.sql`).
- Perubahan pada tabel ERD **hanya menambah kolom**.
- **Setiap tabel baru wajib diikuti `ALTER TABLE nama_tabel ENABLE ROW LEVEL SECURITY;`** di migrasi yang sama. Di Supabase,
  tabel tanpa itu bisa dibaca lewat API publik, padahal berisi data pelanggan. Backend tidak terpengaruh karena
  terhubung sebagai pemilik database.
- Tabel di luar ERD: `settings` (aturan toko), `booking_slots` (jam yang bisa dipesan), `testimonials` (kosong sampai
  ada testimoni asli), dan `schema_migrations` (pencatat migrasi).
- `booking` menyimpan jam mulai dan selesai; harga dan durasi layanan dicatat di `booking_layanan` saat dipesan,
  jadi riwayat tidak berubah kalau menu diubah.

### Nilai status (usulan, menunggu persetujuan di dokumen kontrak)

| Kolom | Nilai |
|---|---|
| `booking.status_booking` | `menunggu_pembayaran` → `dikonfirmasi` → `sedang_dilayani` → `selesai`; cabang `dibatalkan`, `tidak_hadir` |
| `booking.tipe_booking` | `online`, `walk_in` (dijaga database) |
| `pembayaran.status_pembayaran` | `menunggu`, `dibayar`, `gagal`, `kedaluwarsa` |
| `notifikasi_whatsapp.jenis_pesan` | `instruksi_dp`, `bukti_booking`, `invoice`, `jadwal_diubah`, `pembatalan`, `pengingat` |
| `notifikasi_whatsapp.status_kirim` | `menunggu`, `terkirim`, `gagal` |
| `jadwal_capster.status_slot` | `tersedia`, `libur` |

### Untuk yang mengerjakan web internal (admin, capster, owner)

- Pakai tabel ERD yang sama. Jangan membuat tabel kembar.
- **Konfirmasi DP:** ubah `pembayaran` (jenis `dp`) menjadi `dibayar` dan `booking.status_booking` menjadi `dikonfirmasi`.
  Worker backend yang mengirim pesan **bukti booking** sendiri (tidak perlu memanggil apa pun).
- **Pelunasan:** tambahkan baris `pembayaran` jenis `pelunasan` berstatus `dibayar`. Worker menerbitkan `invoice`
  (nomor `INV-YYYYMMDD-NNNN`) dan mengirim pesan invoice. File PDF belum dibuat (`invoice.file_pdf`).
- **Walk-in:** insert `booking` dengan `tipe_booking = 'walk_in'`. Indeks unik `booking_capster_mulai_aktif` menjaga
  satu capster tidak punya dua booking aktif di jam mulai yang sama; cek tumpang tindih durasi sebaiknya memakai fungsi di
  `src/services/availability.js` supaya aturannya sama.
- **Jadwal kerja capster:** isi `jadwal_capster` per tanggal (`tersedia` atau `libur`). Capster tanpa baris di tanggal itu
  ikut jam buka toko dan hari libur mingguan bawaannya (`capster.hari_libur`).
- Endpoint untuk admin (login, daftar booking, ubah status) **belum ada** di backend ini.

## API customer

Semua balasan JSON. Error: `{ "error": { "code": "slot_taken", "message": "..." } }`.
Pelanggan tidak punya akun: **kode booking + nomor WhatsApp** adalah kuncinya.

| Endpoint | Fungsi |
|---|---|
| `GET /api/health` | Status server dan database |
| `GET /api/catalog` | Layanan, kapster, galeri gaya rambut, testimoni, aturan booking |
| `GET /api/availability?date=YYYY-MM-DD&serviceId=...` | Untuk tiap jam: slug capster yang bisa melayani (kosong = penuh) |
| `POST /api/reservations` | Buat booking. Body: `serviceId, barberId?, date, time, customerName, customerPhone, hairstyle?`. `barberId` kosong atau `any` = tanpa preferensi |
| `POST /api/reservations/lookup` | Cek booking. Body: `code, phone` |
| `POST /api/reservations/:code/reschedule` | Ubah jadwal. Body: `phone, barberId, date, time` |
| `POST /api/reservations/:code/cancel` | Batalkan (hanya selama menunggu DP). Body: `phone` |

Alur booking (DP manual): dibuat `menunggu_pembayaran` dan menahan slot selama `dp_hold_minutes` (bawaan 120 menit) →
pesan **instruksi DP** → admin mengonfirmasi → `dikonfirmasi` + pesan **bukti booking** → pelunasan → **invoice**.
DP yang tidak dibayar sampai batas waktu dibatalkan otomatis dan slotnya dibuka.

Aturan yang ditegakkan server: jam buka dan tutup, istirahat, layanan harus selesai sebelum tutup, jadwal dan hari
libur capster, tumpang tindih durasi, jam yang sudah lewat, jangkauan hari, batas ubah jadwal, batas 3 booking aktif per
nomor WhatsApp, dan batas percobaan per IP. Pemesanan serentak untuk slot yang sama diurutkan dengan kunci database
sehingga hanya satu yang berhasil. Kode atau nomor salah selalu dijawab "tidak ditemukan".

## WhatsApp otomatis

| Kapan | Pesan |
|---|---|
| Booking dibuat | **Instruksi DP**: nominal, batas bayar, cara bayar (`settings.dp_instruksi`) |
| Admin mengonfirmasi DP | **Bukti booking**: kode, jadwal, DP dan sisa |
| Pelunasan dicatat | **Invoice**: nomor invoice, total, status lunas |
| Jadwal diubah / dibatalkan / DP kedaluwarsa | Kabar perubahan atau pembatalan |
| `reminder_minutes_before` menit sebelum jadwal (bawaan 120) | Pengingat (hanya booking terkonfirmasi) |

Cara kerjanya: perubahan booking menulis pesan ke tabel `notifikasi_whatsapp` (antrean) dalam transaksi yang sama, lalu
worker di backend mengirimnya tiap 5 detik. Pemesanan tidak pernah gagal gara-gara WhatsApp bermasalah. Pesan yang gagal
dicoba ulang dengan jeda 30 detik, 2 menit, 10 menit, 30 menit, lalu ditandai `gagal` setelah 5 percobaan (alasan di
`error_terakhir`). Teks semua pesan ada di `src/notifications/templates.js`.

Memantau: `SELECT jenis_pesan, status_kirim, percobaan, error_terakhir FROM notifikasi_whatsapp ORDER BY id_notifikasi DESC LIMIT 20;`

### Memasang Fonnte (penyedia WhatsApp)

1. Daftar di [fonnte.com](https://fonnte.com), tambah *Device*, lalu scan QR dengan WhatsApp **nomor toko**.
2. Salin *token* perangkat ke `FONNTE_TOKEN` di `backend/.env`, isi `WHATSAPP_PROVIDER=fonnte` dan `PUBLIC_WEB_URL`.
3. Restart backend. Log harus menulis `WhatsApp: penyedia fonnte`.
4. **Uji dulu ke nomormu sendiri**: buat satu booking dengan nomor sendiri, pesan instruksi DP harus masuk dalam beberapa detik.

Fonnte bukan layanan resmi Meta. Pakai nomor khusus toko, jangan kirim massal, dan jaga perangkat di Fonnte tetap
*connected*. Kalau terputus, pesan tertahan di antrean dan terkirim sendiri setelah tersambung lagi.

## Virtual Try-On AI

Pelanggan mengunggah foto, memilih gaya rambut, lalu AI mengganti rambut di foto itu. Browser memperkecil foto dan foto referensi
gaya, mengirimnya ke `POST /api/try-on`, dan backend meneruskannya ke penyedia AI memakai token dari `.env`. Token tidak pernah
sampai ke browser, dan foto tidak disimpan di server maupun database.

Memasang (cukup isi `.env`, lalu restart backend):

1. Buat kunci API. Gemini (bawaan): https://aistudio.google.com/apikey. OpenAI: https://platform.openai.com/api-keys.
2. Isi `TRYON_API_KEY=` dengan kunci itu. Untuk OpenAI isi juga `TRYON_PROVIDER=openai`, untuk OpenRouter `TRYON_PROVIDER=openrouter`.
   `TRYON_MODEL` (model pemasangan gaya) dan `TRYON_ANALYSIS_MODEL` (model analisa wajah) opsional.
   OpenRouter: analisa wajah memakai model gratis (`:free`), tetapi pemasangan gaya butuh model yang menerima foto (`input_references`)
   dan itu berbayar, jadi akunnya perlu saldo kredit. Model `:free` yang hanya teks-ke-gambar (mis. Recraft Flash) tidak bisa
   dipakai. Daftar model yang mendukung edit foto: `https://openrouter.ai/api/v1/images/models`.
3. Log harus menulis `Try-on AI: penyedia gemini` (atau `openai`). Kalau token kosong, log menulis "belum aktif" dan web
   menampilkan fitur ini sebagai belum diaktifkan (tidak ada hasil palsu).

| Endpoint | Fungsi |
|---|---|
| `GET /api/try-on/status` | `{ "enabled", "canGenerate" }`. `enabled` = analisa wajah aktif, `canGenerate` = pasang gaya di foto aktif. Dipakai web untuk menampilkan atau menyembunyikan tombol AI. |
| `POST /api/try-on/analyze` | Body `{ photo }`. Jawaban `{ faceShape, hairType, summary, recommendedIds }`: AI menilai wajah dan memilih gaya dari galeri toko yang cocok. |
| `POST /api/try-on` | Body `{ photo, reference, haircutName }`, tiap gambar `{ mimeType, base64 }` (JPEG/PNG/WebP). Jawaban `{ image: "data:..." }`. |

**Mode analisa saja:** isi `TRYON_GENERATE_IMAGE=false`. Analisa wajah dan rekomendasi gaya tetap jalan (bisa gratis dengan model `:free`
di OpenRouter), tetapi `POST /api/try-on` dijawab 503 dan web tidak menampilkan tombol pasang gaya. Cocok kalau tidak ada saldo untuk model
gambar. Hapus baris itu kapan saja untuk menyalakan pasang gaya di foto.

Batas: 8 MB per permintaan, 20 try-on per 10 menit per IP (`TRYON_RATE_LIMIT`). Tiap try-on memakai kuota berbayar di penyedia AI.
Kegagalan penyedia dijawab 502 dengan pesan ramah; detailnya hanya masuk log server.

## Yang belum ada

- Pembayaran DP otomatis lewat payment gateway (sekarang DP manual, dikonfirmasi admin).
- Verifikasi OTP untuk riwayat transaksi (`otp_riwayat`).
- File PDF invoice (`invoice.file_pdf`).
- Pembatalan otomatis kalau pelanggan tidak check-in 10 menit sebelum jadwal, dan penanganan tidak hadir (`hanguskanDP`).
- Endpoint dan login untuk web internal.
