-- Skema awal Pit Stop Barbershop (PostgreSQL).
-- Dipakai bersama oleh web customer dan web internal (admin, capster, owner).
-- Aturan: tabel dan kolom snake_case; jangan ubah migrasi yang sudah dijalankan, buat file baru (002_...).

-- Pengaturan toko dalam bentuk key/value agar admin bisa mengubahnya tanpa deploy ulang.
CREATE TABLE settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text
);

CREATE TABLE services (
  id               text PRIMARY KEY,                       -- slug, contoh: haircut-dewasa
  name             text NOT NULL,
  description      text NOT NULL,
  price            integer NOT NULL CHECK (price >= 0),    -- Rupiah
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  sort_order       integer NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true
);

CREATE TABLE barbers (
  id               text PRIMARY KEY,                       -- slug, contoh: rizky
  name             text NOT NULL,
  role             text NOT NULL,
  specialty        text NOT NULL,
  experience_years integer NOT NULL CHECK (experience_years >= 0),
  off_days         smallint[] NOT NULL DEFAULT '{}',       -- hari libur mingguan, 0 = Minggu ... 6 = Sabtu
  sort_order       integer NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true
);

-- Jam mulai yang bisa dipesan (format HH:MM, waktu setempat toko).
CREATE TABLE booking_slots (
  time      text PRIMARY KEY CHECK (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE haircuts (
  id         text PRIMARY KEY,                             -- slug, contoh: skin-fade
  name       text NOT NULL,
  barber_id  text NOT NULL REFERENCES barbers (id),
  category   text NOT NULL,
  rating     numeric(2, 1) NOT NULL CHECK (rating BETWEEN 0 AND 10),
  image_path text NOT NULL,                                -- path di folder public frontend
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true
);

CREATE TABLE testimonials (
  id         serial PRIMARY KEY,
  quote      text NOT NULL,
  name       text NOT NULL,
  role       text NOT NULL,
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true
);

CREATE TABLE reservations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE CHECK (code ~ '^PS-[0-9]{4}$'),
  service_id       text NOT NULL REFERENCES services (id),
  barber_id        text NOT NULL REFERENCES barbers (id),
  -- Salinan nama, durasi, dan harga saat dipesan, supaya riwayat tidak berubah kalau menu diubah.
  service_name     text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price            integer NOT NULL CHECK (price >= 0),
  -- Waktu setempat toko (tanpa zona waktu). ends_at = starts_at + durasi.
  starts_at        timestamp NOT NULL,
  ends_at          timestamp NOT NULL CHECK (ends_at > starts_at),
  customer_name    text NOT NULL,
  customer_email   text NOT NULL,
  customer_phone   text,
  hairstyle        text,                                   -- gaya pilihan dari Virtual Try-On
  source           text NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'walk-in')),
  status           text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  reschedule_count integer NOT NULL DEFAULT 0 CHECK (reschedule_count >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  cancelled_at     timestamptz
);

-- Satu kapster tidak boleh punya dua reservasi aktif yang mulai di jam yang sama (pengaman terakhir
-- kalau dua orang memesan bersamaan). Tumpang tindih durasi dicek oleh API di dalam transaksi.
CREATE UNIQUE INDEX reservations_barber_start_active
  ON reservations (barber_id, starts_at)
  WHERE status IN ('confirmed', 'completed');

CREATE INDEX reservations_day_idx ON reservations (starts_at);
CREATE INDEX reservations_email_idx ON reservations (lower(customer_email));
