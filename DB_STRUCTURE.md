## Table `pengguna`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_pengguna` | `int8` | Primary Identity |
| `nama_lengkap` | `varchar` |  |
| `email` | `varchar` |  Unique |
| `password_hash` | `text` |  |
| `role` | `varchar` |  |
| `status_aktif` | `bool` |  |

## Table `capster`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_capster` | `int8` | Primary Identity |
| `id_pengguna` | `int8` |  Unique |
| `nama_capster` | `varchar` |  |
| `spesialisasi` | `varchar` |  Nullable |
| `foto` | `text` |  Nullable |
| `status_aktif` | `bool` |  |

## Table `profil_usaha`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_profil` | `int8` | Primary Identity |
| `id_pengguna` | `int8` |  Unique |
| `nama_usaha` | `varchar` |  |
| `alamat` | `text` |  Nullable |
| `no_kontak` | `varchar` |  Nullable |
| `jam_operasional` | `text` |  Nullable |

## Table `customer`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_customer` | `int8` | Primary Identity |
| `nama_customer` | `varchar` |  |
| `no_whatsapp` | `varchar` |  |
| `created_at` | `timestamptz` |  |

## Table `otp_riwayat`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_otp` | `int8` | Primary Identity |
| `id_customer` | `int8` |  |
| `kode_otp_hash` | `text` |  |
| `waktu_kadaluarsa` | `timestamptz` |  |
| `status_pakai` | `bool` |  |

## Table `layanan`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_layanan` | `int8` | Primary Identity |
| `nama_layanan` | `varchar` |  |
| `deskripsi` | `text` |  Nullable |
| `harga` | `numeric` |  |
| `durasi_menit` | `int4` |  |
| `status_aktif` | `bool` |  |

## Table `booking`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_booking` | `int8` | Primary Identity |
| `kode_booking` | `varchar` |  Unique |
| `id_customer` | `int8` |  |
| `id_capster` | `int8` |  |
| `tipe_booking` | `varchar` |  |
| `tanggal_booking` | `date` |  |
| `jam_mulai` | `time` |  |
| `jam_selesai` | `time` |  |
| `status_booking` | `varchar` |  |
| `total_harga` | `numeric` |  |
| `nominal_dp` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `alasan_batal` | `text` |  Nullable |

## Table `booking_layanan`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_detail` | `int8` | Primary Identity |
| `id_booking` | `int8` |  |
| `id_layanan` | `int8` |  |
| `harga_satuan` | `numeric` |  |
| `subtotal` | `numeric` |  |

## Table `jadwal_capster`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_jadwal` | `int8` | Primary Identity |
| `id_capster` | `int8` |  |
| `tanggal` | `date` |  |
| `jam_mulai` | `time` |  |
| `jam_selesai` | `time` |  |
| `status_slot` | `varchar` |  |

## Table `riwayat_layanan`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_riwayat` | `int8` | Primary Identity |
| `id_booking` | `int8` |  |
| `id_transaksi` | `int8` | Nullable, FK ke `transaksi` untuk walk-in |
| `id_capster` | `int8` |  |
| `status_layanan` | `varchar` |  |
| `waktu_status` | `timestamptz` |  |
| `catatan` | `text` |  Nullable |

## Table `antrean_kosong`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_antrean` | `int8` | Primary Identity |
| `id_booking` | `int8` |  Nullable |
| `id_capster` | `int8` |  |
| `tanggal` | `date` |  |
| `jam_mulai` | `time` |  |
| `jam_selesai` | `time` |  |
| `status_antrean` | `varchar` |  |

## Table `pembayaran`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_pembayaran` | `int8` | Primary Identity |
| `id_booking` | `int8` |  |
| `jenis_pembayaran` | `varchar` |  |
| `metode_pembayaran` | `varchar` |  |
| `nominal` | `numeric` |  |
| `status_pembayaran` | `varchar` |  |
| `ref_gateway` | `varchar` |  Nullable |
| `waktu_bayar` | `timestamptz` |  Nullable |

## Table `invoice`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_invoice` | `int8` | Primary Identity |
| `id_booking` | `int8` |  Unique |
| `nomor_invoice` | `varchar` |  Unique |
| `tanggal_terbit` | `date` |  |
| `total_tagihan` | `numeric` |  |
| `file_pdf` | `text` |  Nullable |

## Table `notifikasi_whatsapp`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_notifikasi` | `int8` | Primary Identity |
| `id_booking` | `int8` |  |
| `no_tujuan` | `varchar` |  |
| `jenis_pesan` | `varchar` |  |
| `status_kirim` | `varchar` |  |
| `waktu_kirim` | `timestamptz` |  Nullable |

## Table `pengeluaran`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_pengeluaran` | `int8` | Primary Identity |
| `id_pengguna` | `int8` |  |
| `kategori` | `varchar` |  |
| `deskripsi` | `text` |  Nullable |
| `nominal` | `numeric` |  |
| `tanggal_pengeluaran` | `date` |  |

## Table `galeri`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_galeri` | `int8` | Primary Identity |
| `id_pengguna` | `int8` |  |
| `judul` | `varchar` |  |
| `file_gambar` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `pengaturan_dp`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_pengaturan` | `int8` | Primary Identity |
| `id_pengguna` | `int8` |  |
| `persentase_dp` | `numeric` |  |
| `berlaku_sejak` | `date` |  |

## Table `jejak_audit`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_log` | `int8` | Primary Identity |
| `id_pengguna` | `int8` |  |
| `waktu` | `timestamptz` |  |
| `aksi` | `varchar` |  |
| `jenis_objek` | `varchar` |  |
| `id_objek` | `int8` |  |

## Table `laporan`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_laporan` | `int8` | Primary Identity |
| `id_pengguna` | `int8` |  |
| `jenis_laporan` | `varchar` |  |
| `periode_mulai` | `date` |  |
| `periode_selesai` | `date` |  |
| `format_ekspor` | `varchar` |  |
| `created_at` | `timestamptz` |  |

## Table `transaksi` (tambahan untuk sistem internal)

Tabel transaksi diperlukan agar Admin/Cashier dapat mencatat walk-in tanpa membuat booking. Transaksi online dapat ditautkan ke satu booking; transaksi walk-in tidak mempunyai `id_booking`.

| Name | Type | Constraints |
|------|------|-------------|
| `id_transaksi` | `int8` | Primary Identity |
| `kode_transaksi` | `varchar` | Unique |
| `jenis_transaksi` | `varchar` | `booking` atau `walk-in` |
| `id_booking` | `int8` | Nullable, Unique, FK ke `booking` |
| `id_customer` | `int8` | Nullable, FK ke `customer` |
| `id_capster` | `int8` | Nullable, FK ke `capster` |
| `id_pengguna` | `int8` | Nullable, FK ke `pengguna` (kasir pencatat) |
| `total_tagihan` | `numeric` |  |
| `total_dibayar` | `numeric` |  |
| `status_transaksi` | `varchar` |  |
| `status_layanan` | `varchar` | Status progres pelayanan, terpisah dari pembayaran |
| `metode_pembayaran` | `varchar` | Nullable |
| `created_at` | `timestamptz` |  |

## Table `transaksi_layanan` (tambahan untuk snapshot item transaksi)

Menyimpan rincian layanan transaksi dan snapshot nama/harga agar riwayat transaksi tidak berubah ketika master layanan diperbarui.

| Name | Type | Constraints |
|------|------|-------------|
| `id_detail` | `int8` | Primary Identity |
| `id_transaksi` | `int8` | FK ke `transaksi` |
| `id_layanan` | `int8` | Nullable, FK ke `layanan` |
| `nama_layanan_snapshot` | `varchar` |  |
| `harga_satuan` | `numeric` |  |
| `subtotal` | `numeric` |  |

## Perubahan relasi `invoice`

`invoice.id_booking` menjadi nullable dan `invoice.id_transaksi` ditambahkan sebagai nullable, unique foreign key ke `transaksi`. Minimal salah satu dari `id_booking` atau `id_transaksi` harus diisi. Relasi transaksi memungkinkan invoice walk-in tanpa booking online.

`riwayat_layanan.id_transaksi` ditambahkan sebagai nullable foreign key ke `transaksi`, agar progres pelayanan walk-in tercatat terpisah dari status finansial transaksi.

`booking.status_booking` tetap menyimpan status booking. Progres seperti layanan dimulai/selesai hanya dicatat pada `riwayat_layanan.status_layanan`; status Tidak Hadir dan kembali ke antrean dicatat pada `booking`/`antrean_kosong`.

**Catatan konsistensi DP:** blueprint menetapkan nominal DP Rp25.000 per booking, sementara kolom `pengaturan_dp` menyimpan `persentase_dp`. Halaman internal saat ini merekam pengaturan persentase tanpa menerapkannya ke nominal booking; kebijakan tersebut perlu diselaraskan sebelum dipakai sebagai aturan aktif.

## Migrasi database

Skema implementasi tersedia pada `backend/db/migrations/001_internal_system.sql` dan dijalankan dengan `npm run db:migrate`. Password awal owner dibuat melalui `npm run db:bootstrap-owner` setelah kredensial bootstrap diisi pada `backend/.env`.

