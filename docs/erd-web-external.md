# ERD Web External (Customer)

Database PostgreSQL yang dipakai web customer, diambil dari `backend/migrations/001` sampai `003`.
Diagram di bawah tampil otomatis di GitHub. Versi gambar: [erd-web-external.png](erd-web-external.png).

```mermaid
erDiagram
    SERVICES ||--o{ RESERVATIONS : "dipesan di"
    BARBERS ||--o{ RESERVATIONS : "melayani"
    BARBERS ||--o{ HAIRCUTS : "mengerjakan"
    RESERVATIONS ||--o{ NOTIFICATIONS : "memicu pesan"

    SERVICES {
        text id PK "slug, mis. haircut-dewasa"
        text name
        text description
        integer price "Rupiah"
        integer duration_minutes
        integer sort_order
        boolean is_active
    }

    BARBERS {
        text id PK "slug, mis. rizky"
        text name
        text role
        text specialty
        integer experience_years
        smallint[] off_days "0=Minggu ... 6=Sabtu"
        integer sort_order
        boolean is_active
    }

    HAIRCUTS {
        text id PK "slug"
        text name
        text barber_id FK
        text category
        numeric rating
        text image_path
        integer sort_order
        boolean is_active
    }

    RESERVATIONS {
        uuid id PK
        text code UK "PS-1234"
        text service_id FK
        text barber_id FK
        text service_name "salinan saat dipesan"
        integer duration_minutes "salinan"
        integer price "salinan"
        timestamp starts_at "waktu setempat toko"
        timestamp ends_at
        text customer_name
        text customer_email
        text customer_phone "62812..., untuk WhatsApp"
        text hairstyle "dari Virtual Try-On"
        text source "online / walk-in"
        text status "confirmed / completed / cancelled / no_show"
        integer reschedule_count
        timestamptz reminder_sent_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz cancelled_at
    }

    NOTIFICATIONS {
        bigint id PK
        uuid reservation_id FK
        text kind "created / rescheduled / cancelled / reminder"
        text channel "whatsapp"
        text recipient "nomor tujuan"
        text message
        text status "pending / sent / failed"
        integer attempts
        text last_error
        text provider_ref
        timestamptz next_attempt_at
        timestamptz created_at
        timestamptz sent_at
    }

    BOOKING_SLOTS {
        text time PK "HH:MM, jam yang bisa dipesan"
        boolean is_active
    }

    SETTINGS {
        text key PK "jam buka, istirahat, batas ubah jadwal, dst."
        text value
        text description
    }

    TESTIMONIALS {
        serial id PK
        text quote
        text name
        text role
        text image_path
        integer sort_order
        boolean is_active
    }
```

## Penjelasan singkat

| Tabel | Fungsi |
|---|---|
| `services` | Menu layanan, harga, dan durasi. |
| `barbers` | Kapster beserta hari libur mingguan (`off_days`). |
| `haircuts` | Galeri gaya rambut; tiap gaya dikerjakan satu kapster. |
| `reservations` | Inti sistem: satu baris per reservasi. Nama, durasi, dan harga layanan **disalin** ke sini supaya riwayat tidak berubah kalau menu diubah. |
| `notifications` | Antrean pesan WhatsApp (invoice, ubah, batal, pengingat). Pesan ditulis bersamaan dengan perubahan reservasi, lalu dikirim oleh worker. |
| `booking_slots` | Daftar jam mulai yang bisa dipesan. Tidak punya relasi langsung; dipakai sebagai aturan. |
| `settings` | Pengaturan toko (jam buka/tutup, istirahat, hari ke depan, batas ubah jadwal, batas reservasi per email, alamat, pengingat). Tidak punya relasi. |
| `testimonials` | Testimoni pelanggan asli. Kosong sampai ada data nyata. |

## Aturan yang dijaga database

- `reservations.code` unik dan harus berbentuk `PS-` diikuti 4 angka.
- Satu kapster tidak boleh punya dua reservasi aktif yang **mulai di jam yang sama**
  (indeks unik parsial `reservations_barber_start_active`, berlaku untuk status `confirmed` dan `completed`).
  Tumpang tindih karena durasi dicek oleh API di dalam transaksi dengan kunci per kapster per hari.
- `ends_at` harus setelah `starts_at`; harga dan durasi tidak boleh negatif.
- Menghapus reservasi ikut menghapus pesan di `notifications` (`ON DELETE CASCADE`).
- Menu (layanan, kapster, gaya) sebaiknya dinonaktifkan lewat `is_active = false`, bukan dihapus,
  karena reservasi dan gaya merujuknya.

## Catatan untuk web internal (admin, capster, owner)

Transaksi dan pembayaran **belum ada** di skema ini. Kalau web internal butuh tabel transaksi, tambahkan lewat
migrasi baru (`004_...sql`) yang merujuk `reservations.id`, jangan membuat tabel reservasi kembar.
