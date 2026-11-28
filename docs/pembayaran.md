# Pembayaran DP online (Midtrans)

Pelanggan yang menunggu DP melihat menu **Pilih pembayaran** di e-tiket:

| Pilihan | Cara kerja | Konfirmasi |
|---|---|---|
| **Bayar online** | Diarahkan ke halaman bayar Midtrans (QRIS, virtual account, e-wallet) | Otomatis |
| **Transfer manual** | Instruksi rekening dari pengaturan `dp_instruksi` | Admin, seperti sebelumnya |

Kalau `MIDTRANS_SERVER_KEY` kosong, hanya transfer manual yang tampil. Tidak ada yang rusak.

## Alur bayar online

```
e-tiket ──"Bayar Rp 25.000"──> POST /api/reservations/:kode/pay
                                  server membuat transaksi Snap (order id PS-1234-<unik>), batas bayar = sisa waktu tahan slot
        <── redirectUrl ───────── pelanggan membayar di halaman Midtrans
Midtrans ──webhook──> POST /api/payments/midtrans/notification   (tanda tangan diperiksa, status dibaca ulang dari server Midtrans)
pelanggan kembali ke /e-ticket?order_id=...  ──> POST /api/reservations/:kode/pay/sync  (server menanyakan status ke Midtrans)
                                  keduanya menjalankan hal yang sama:
                                  pembayaran DP = dibayar, booking = dikonfirmasi, transaksi internal tercatat,
                                  worker mengirim bukti booking ke WhatsApp
```

Webhook dan sinkron saat kembali saling menutup: kalau webhook tidak bisa sampai (uji di laptop) atau terlambat, sinkron saat kembali tetap mengonfirmasi, dan sebaliknya. Memproses dua kali aman (DP yang sudah dibayar dilewati).

## Keamanan
- Kunci server hanya di `backend/.env`, tidak pernah dikirim ke browser.
- Webhook ditolak (403) kalau tanda tangan SHA512 tidak cocok, dan status yang dipakai **bukan isi webhook** melainkan bacaan ulang dari server Midtrans.
- Konfirmasi otomatis hanya bila `status_code` 200, status `settlement` (atau `capture` dengan fraud `accept`), dan nominal sama persis dengan DP booking.
- Halaman bayar kedaluwarsa bersamaan dengan batas tahan slot, jadi pembayaran tidak bisa masuk setelah slot dilepas. Kalau tetap terjadi (jaringan terlambat), DP dicatat dibayar tapi booking dibatalkan **tidak dihidupkan lagi**; kasir perlu menindaklanjuti (ada catatan di log: "Pembayaran ... masuk setelah booking ... dibatalkan").
- Lingkungan ditentukan `MIDTRANS_IS_PRODUCTION` (kosong = sandbox), bukan awalan kunci: kunci sandbox terbaru berawalan `Mid-server-`, sama seperti produksi. Kunci yang tidak cocok dengan lingkungannya ditolak Midtrans (401), dan kunci berawalan `SB-` di mode produksi ditolak backend.

## Mengaktifkan di sandbox (uji)

1. Dashboard Midtrans > Environment **Sandbox** > Settings > **Access Keys**. Salin **Server Key** (`Mid-server-...`, atau `SB-Mid-server-...` di akun lama).
2. Tempel di `backend/.env`: `MIDTRANS_SERVER_KEY=Mid-server-...` (jangan di-commit, jangan dikirim lewat chat).
3. Nyalakan ulang backend (`docker compose up -d api`). Di log harus muncul: `Pembayaran online: Midtrans SANDBOX (uji)`.
4. Buat booking, buka e-tiket, tekan **Bayar**. Di halaman bayar sandbox pilih metode, lalu simulasikan pembayaran dengan
   [Midtrans Payment Simulator](https://simulator.sandbox.midtrans.com/) (QRIS, virtual account, dll.). Tekan "Kembali ke toko"
   atau **Cek status pembayaran** di e-tiket: DP berubah jadi dibayar dan booking dikonfirmasi.

### Webhook (supaya konfirmasi otomatis tanpa menunggu pelanggan kembali)
Dashboard Midtrans > Settings > Configuration > **Payment Notification URL**:
`https://<domain-publik>/api/payments/midtrans/notification` (lewat Cloudflare Tunnel; lihat `docs/deploy.md`).
Di laptop tanpa alamat publik, webhook tidak sampai; sinkron saat kembali dan tombol **Cek status pembayaran** yang bekerja.
Atur juga **Finish Redirect URL** bila perlu; backend sudah mengirim alamat kembali `PUBLIC_WEB_URL/e-ticket` per transaksi.

## Menuju produksi
Daftarkan bisnis di Midtrans, aktifkan metode yang dipakai, isi kunci produksi (`Mid-server-...`) dan `MIDTRANS_IS_PRODUCTION=true`.
Uji ulang seluruh alur dengan nominal kecil sebelum dibuka ke pelanggan.

## Data
Tidak ada tabel atau kolom baru. Memakai `pembayaran` (`metode_pembayaran` = `midtrans` atau `midtrans:<jenis>`, `ref_gateway` = order id,
`status_pembayaran` = `menunggu` / `dibayar`, `waktu_bayar`) dan, bila ada, `transaksi` milik web internal (`TRX-<kode>`, status `belum`, metode `QRIS` / `Transfer Bank` / `Online`).
