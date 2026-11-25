# ERD

ERD resmi proyek ada di laporan (ERD dan Use Case Diagram), dan strukturnya tercatat di
[`backend/migrations/005_official_erd.sql`](../backend/migrations/005_official_erd.sql) (19 tabel).
Kesepakatan nilai dan pembagian tugas: [`kontrak-data-dan-use-case.md`](kontrak-data-dan-use-case.md).

Web customer tidak punya tabel sendiri yang menggandakan ERD. Penambahannya hanya **kolom** (migrasi `006`):

| Tabel | Kolom tambahan | Untuk |
|---|---|---|
| `layanan` | `slug` | alamat web dan pilihan di form |
| `capster` | `slug`, `jabatan`, `pengalaman_tahun`, `hari_libur` | halaman kapster dan ketersediaan |
| `galeri` | `slug`, `kategori`, `id_capster`, `urutan` | galeri dan Virtual Try-On |
| `booking` | `jumlah_ubah_jadwal`, `gaya_try_on`, `pengingat_terkirim_at`, `updated_at` | ubah jadwal, Try-On, pengingat |
| `notifikasi_whatsapp` | `pesan`, `percobaan`, `error_terakhir`, `ref_penyedia`, `jadwal_kirim` | antrean WhatsApp dengan percobaan ulang |

Tabel di luar ERD (kecil, bukan dobel): `settings` (aturan toko), `booking_slots` (jam yang bisa dipesan), `testimonials`
(kosong sampai ada testimoni asli), `schema_migrations` (pencatat migrasi).
