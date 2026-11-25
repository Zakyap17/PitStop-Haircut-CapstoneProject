# Kontrak Data & Use Case: Web Customer ↔ Web Internal

Tujuan: dua developer memakai **satu skema** dan satu arti yang sama untuk setiap nilai. Acuannya adalah ERD laporan
(19 tabel, lihat `DB_STRUCTURE.md`). Tabel buatan web customer (`services`, `barbers`, `reservations`, `notifications`,
`haircuts`) dihapus dan dipindah ke tabel ERD. Kolom `Usulan` di bawah tinggal dijawab **Setuju** atau diganti.

## 1. Prinsip

1. Satu skema: ERD laporan. Tidak ada tabel kembar.
2. Perubahan struktur hanya lewat file migrasi di `backend/migrations/` (urut, tidak mengubah yang sudah jalan).
3. Perubahan di tabel ERD hanya **menambah kolom** (tidak mengubah atau menghapus kolom yang sudah ada).
4. Setiap tabel baru wajib `ENABLE ROW LEVEL SECURITY`.

## 2. Use case (mengikuti Use Case Diagram resmi)

### Istilah (penting, sering tertukar)

| Istilah | Artinya | Dikirim kapan |
|---|---|---|
| **Bukti booking** | E-tiket berisi kode booking dan QR. Bukti bahwa slot sudah dikunci. | **Setelah DP dibayar** (status `dikonfirmasi`) |
| **Invoice** | Tagihan resmi (nomor invoice, total, PDF). | **Setelah pelunasan** |
| Instruksi DP | Nominal DP, cara bayar, dan batas waktunya. | Saat booking dibuat (status `menunggu_pembayaran`) |

### Customer (web customer)
| Use case | Keterangan | Tabel |
|---|---|---|
| Melihat daftar layanan dan harga | | `layanan` |
| Melihat profil dan kontak | halaman Lokasi | `profil_usaha` |
| Melihat profil Capster | | `capster` |
| Melihat galeri gaya rambut | | `galeri` |
| **Melakukan booking** | include: memilih layanan; memilih jadwal dan tanggal (extend: menampilkan jadwal alternatif); memilih Capster **atau tanpa preferensi**; mengisi nama dan nomor WhatsApp; **membayar down payment** | `customer`, `booking`, `booking_layanan`, `pembayaran` (DP) |
| Membayar down payment | extend: mencoba bayar ulang; membatalkan booking. include: menerima **bukti booking** via WhatsApp (extend: mengunduh bukti booking) | `pembayaran`, `notifikasi_whatsapp` |
| Melunasi pembayaran | include: menerima **invoice** via WhatsApp (extend: mengunduh invoice) | `pembayaran`, `invoice` |
| Melihat riwayat transaksi | include: **verifikasi OTP** | `otp_riwayat`, `booking` |

### Admin/Kasir, Owner, Capster (web internal)
| Aktor | Use case |
|---|---|
| Admin/Kasir | Login; kelola transaksi walk-in; **kelola booking online** (include: menerima pelunasan dan invoice via WhatsApp; extend: **menjadwalkan ulang customer**); lihat laporan operasional; kelola data customer; logout |
| Owner | Kelola akun, layanan, galeri, pengeluaran; monitoring layanan; lihat laporan (extend: ekspor PDF atau CSV) |
| Capster | Lihat jadwal penugasan; lihat riwayat dan pendapatan; **memperbarui status layanan** (include: memulai, menyelesaikan; extend: **menandai customer tidak hadir**, yang lalu bisa memindahkan ke antrean kosong atau menghanguskan DP) |

Catatan: di diagram, **menjadwalkan ulang customer dilakukan Admin**, bukan customer sendiri. Pembatalan oleh customer hanya
muncul pada langkah pembayaran DP.

## 3. Pertanyaan yang harus dijawab (satu baris, satu jawaban)

| # | Pertanyaan | Usulan | Jawaban teman |
|---|---|---|---|
| 1 | Nilai `booking.status_booking` | `menunggu_pembayaran` → `dikonfirmasi` → `sedang_dilayani` → `selesai`; cabang: `dibatalkan`, `tidak_hadir` | |
| 2 | Nilai `pembayaran.status_pembayaran` | `menunggu`, `dibayar`, `gagal`, `kedaluwarsa` | |
| 3 | Nilai `notifikasi_whatsapp.jenis_pesan` dan `status_kirim` | Dari class diagram: `bukti_booking`, `invoice`, `otp`; tambahan dari web customer: `instruksi_dp`, `pengingat`. `status_kirim`: `menunggu`, `terkirim`, `gagal` | |
| 4 | Nilai `status_slot`, `status_antrean`, `status_layanan` | `status_slot`: `tersedia`/`libur`; `status_antrean`: `kosong`/`terisi`; `status_layanan`: `menunggu`/`berjalan`/`selesai` | |
| 5 | Nominal DP | `persentase_dp` terbaru × `total_harga`; kalau belum ada baris `pengaturan_dp`, pakai bawaan 25.000 | |
| 6 | Batas waktu bayar DP | 2 jam sejak dipesan; lewat itu booking otomatis `dibatalkan` (`alasan_batal` = "DP tidak dibayar tepat waktu") dan slot dibuka | |
| 7 | Dari mana jam tersedia dihitung | Class diagram: `JadwalCapster.cekKetersediaan()`. Usulan: jam kerja kapster pada tanggal itu = baris `jadwal_capster` (status `tersedia`); baris berstatus `libur` = libur. **Kalau kapster belum punya baris untuk tanggal itu, ikut jam buka toko** (supaya tabel yang masih kosong tidak membuat semua slot penuh) | |
| 8 | Siapa yang mengisi `jadwal_capster` dan `antrean_kosong` | `jadwal_capster`: Capster lewat `tandaiLibur()` dan Admin. `antrean_kosong`: slot kosong tempat customer dipindahkan (`pindahkanCustomer()`) setelah tidak hadir atau pembatalan. **Mohon dibenarkan temanmu** | |
| 9 | Capster wajib punya akun `pengguna` | Dibuatkan 4 akun `capster` dengan `password_hash = '!'` (tidak bisa login) dan email sementara; admin menggantinya | |
| 10 | Identitas pelanggan | `no_whatsapp` (bukan email). Cek reservasi = kode booking + nomor WhatsApp. OTP (`otp_riwayat`) menyusul setelah Jumat | |
| 11 | Siapa yang membuat API admin (login, daftar booking, konfirmasi DP) | Diputuskan: teman memakai backend Express yang sama (`backend/src/routes/`), atau langsung ke database lewat koneksinya sendiri? | |
| 13 | Siapa yang memicu WhatsApp **bukti booking** (setelah DP dibayar) dan **invoice** (setelah pelunasan), karena statusnya diubah oleh web internal | Worker backend memeriksa tiap beberapa detik: `booking` yang baru `dikonfirmasi` tanpa pesan bukti booking, dan `pembayaran` pelunasan yang baru `dibayar` tanpa pesan invoice, lalu mengirimnya. Web internal cukup mengubah status di database, tanpa memanggil apa pun | |
| 14 | Tanpa preferensi capster | Sistem memilih capster kosong dengan beban booking paling sedikit hari itu | |
| 15 | Isi invoice PDF | Nomor invoice `INV-YYYYMMDD-####`, rincian layanan, total, DP, sisa, tanggal terbit; dibuat saat pelunasan | |
| 12 | Cara mengamankan `password_hash` | bcrypt atau argon2? (belum ada kode login di mana pun) | |

## 4. Kolom yang kuusulkan ditambah ke tabel ERD (hanya menambah)

| Tabel | Kolom baru | Untuk |
|---|---|---|
| `layanan` | `slug` (unik) | alamat web dan pilihan di form |
| `capster` | `slug` (unik), `jabatan`, `pengalaman_tahun`, `hari_libur` (array) | halaman kapster dan ketersediaan |
| `galeri` | `slug`, `kategori`, `id_capster` | galeri dan Virtual Try-On |
| `booking` | `reschedule_count`, `gaya_try_on`, `pengingat_terkirim_at`, `updated_at` | ubah jadwal, Try-On, pengingat |
| `notifikasi_whatsapp` | `pesan`, `percobaan`, `error_terakhir`, `ref_penyedia`, `jadwal_kirim` | antrean WhatsApp dengan percobaan ulang |

Tabel di luar ERD yang tetap ada (kecil, bukan dobel): `settings` (aturan toko: istirahat, hari ke depan, batas ubah
jadwal, batas waktu DP), `booking_slots` (jam yang bisa dipesan), `testimonials` (kosong sampai ada testimoni asli).

## 5. Yang sudah diputuskan

- Pewarisan akun: `Pengguna` → `Owner`, `Admin`, `Capster` (kolom `pengguna.role`).
- Daftar operasi di class diagram (mis. `Booking.hanguskanDP()`, `Pembayaran.verifikasiCallback()`, `NotifikasiWhatsapp.kirimBuktiBooking()`) menjadi acuan perilaku.

- ERD laporan adalah acuan tunggal.
- DP manual, dikonfirmasi admin (bukan payment gateway) untuk testing Jumat.
- Pesan WhatsApp lewat Fonnte, antrean di database.
- Tanpa data dummy: testimoni dan angka klaim dihapus dari web sampai ada data asli.
