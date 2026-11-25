-- Menyatukan web customer ke skema resmi (ERD laporan). Tabel buatan web customer yang dobel dipindah lalu dihapus:
--   services -> layanan,  barbers -> capster (+ pengguna),  haircuts -> galeri,
--   reservations -> booking (+ customer, booking_layanan),  notifications -> notifikasi_whatsapp.
-- Perubahan pada tabel resmi hanya MENAMBAH kolom dan indeks. Tidak ada kolom resmi yang diubah atau dihapus.

-- ---------- 1. Kolom tambahan di tabel resmi ----------
ALTER TABLE layanan ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE capster
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS jabatan text,
  ADD COLUMN IF NOT EXISTS pengalaman_tahun integer,
  -- Hari libur mingguan bawaan (0 = Minggu ... 6 = Sabtu), dipakai kalau kapster belum punya baris di jadwal_capster.
  ADD COLUMN IF NOT EXISTS hari_libur smallint[] NOT NULL DEFAULT '{}';

ALTER TABLE galeri
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS kategori text,
  ADD COLUMN IF NOT EXISTS id_capster bigint REFERENCES capster (id_capster),
  ADD COLUMN IF NOT EXISTS urutan integer NOT NULL DEFAULT 0;

ALTER TABLE booking
  ADD COLUMN IF NOT EXISTS jumlah_ubah_jadwal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gaya_try_on text,
  ADD COLUMN IF NOT EXISTS pengingat_terkirim_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Antrean pesan WhatsApp: pesan dibuat dulu, dikirim oleh worker, dan dicoba ulang kalau gagal.
ALTER TABLE notifikasi_whatsapp
  ADD COLUMN IF NOT EXISTS pesan text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS percobaan integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_terakhir text,
  ADD COLUMN IF NOT EXISTS ref_penyedia text,
  ADD COLUMN IF NOT EXISTS jadwal_kirim timestamptz NOT NULL DEFAULT now();

-- ---------- 2. Indeks ----------
CREATE UNIQUE INDEX IF NOT EXISTS layanan_slug_key ON layanan (slug);
CREATE UNIQUE INDEX IF NOT EXISTS capster_slug_key ON capster (slug);
CREATE UNIQUE INDEX IF NOT EXISTS galeri_slug_key ON galeri (slug);
-- Pelanggan dikenali dari nomor WhatsApp (tanpa akun).
CREATE UNIQUE INDEX IF NOT EXISTS customer_no_whatsapp_key ON customer (no_whatsapp);

-- Satu capster tidak boleh punya dua booking aktif yang mulai di jam yang sama (pengaman terakhir untuk pemesanan serentak).
-- Tumpang tindih karena durasi dicek oleh API di dalam transaksi dengan kunci per capster per hari.
CREATE UNIQUE INDEX IF NOT EXISTS booking_capster_mulai_aktif
  ON booking (id_capster, tanggal_booking, jam_mulai)
  WHERE status_booking IN ('menunggu_pembayaran', 'dikonfirmasi', 'sedang_dilayani', 'selesai');

CREATE INDEX IF NOT EXISTS booking_tanggal_idx ON booking (tanggal_booking);
CREATE INDEX IF NOT EXISTS booking_customer_idx ON booking (id_customer);
CREATE INDEX IF NOT EXISTS notifikasi_jatuh_tempo_idx ON notifikasi_whatsapp (jadwal_kirim) WHERE status_kirim = 'menunggu';
CREATE INDEX IF NOT EXISTS notifikasi_booking_idx ON notifikasi_whatsapp (id_booking, jenis_pesan);

-- ---------- 3. Pengaturan ----------
INSERT INTO settings (key, value, description) VALUES
  ('max_active_per_customer', '3',   'Batas booking aktif (belum lewat) per nomor WhatsApp, agar slot tidak diborong'),
  ('dp_hold_minutes',         '120', 'Slot ditahan berapa menit menunggu DP dibayar; lewat itu booking otomatis dibatalkan'),
  ('dp_default_nominal',      '25000', 'Nominal DP (Rp) kalau belum ada pengaturan persentase di tabel pengaturan_dp'),
  ('dp_instruksi',            '',    'Cara bayar DP yang ditampilkan ke pelanggan (rekening/QRIS). Kosong = pelanggan diminta menghubungi kasir')
ON CONFLICT (key) DO NOTHING;

-- ---------- 4. Memindahkan data dari tabel lama ----------
-- Hanya jalan kalau tabel lama masih ada (aman diulang).
DO $$
BEGIN
  IF to_regclass('public.services') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO layanan (nama_layanan, deskripsi, harga, durasi_menit, status_aktif, slug)
  SELECT name, description, price, duration_minutes, is_active, id FROM services ORDER BY sort_order
  ON CONFLICT (slug) DO NOTHING;

  -- Tiap capster wajib punya akun pengguna. Akun sementara: tidak aktif, kata sandi tidak bisa dipakai login,
  -- email sementara (.invalid). Admin menggantinya dengan akun asli.
  INSERT INTO pengguna (nama_lengkap, email, password_hash, role, status_aktif)
  SELECT name, id || '@pitstop.invalid', '!', 'capster', false FROM barbers
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO capster (id_pengguna, nama_capster, spesialisasi, status_aktif, slug, jabatan, pengalaman_tahun, hari_libur)
  SELECT p.id_pengguna, b.name, b.specialty, b.is_active, b.id, b.role, b.experience_years, b.off_days
  FROM barbers b JOIN pengguna p ON p.email = b.id || '@pitstop.invalid'
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO galeri (id_pengguna, judul, file_gambar, slug, kategori, id_capster, urutan)
  SELECT c.id_pengguna, h.name, h.image_path, h.id, h.category, c.id_capster, h.sort_order
  FROM haircuts h JOIN capster c ON c.slug = h.barber_id
  WHERE h.is_active
  ON CONFLICT (slug) DO NOTHING;

  -- Reservasi lama -> customer + booking + booking_layanan + notifikasi_whatsapp.
  INSERT INTO customer (nama_customer, no_whatsapp)
  SELECT DISTINCT ON (customer_phone) customer_name, customer_phone
  FROM reservations WHERE customer_phone IS NOT NULL
  ORDER BY customer_phone, created_at DESC
  ON CONFLICT (no_whatsapp) DO NOTHING;

  INSERT INTO booking (kode_booking, id_customer, id_capster, tipe_booking, tanggal_booking, jam_mulai, jam_selesai,
                       status_booking, total_harga, nominal_dp, created_at, alasan_batal, jumlah_ubah_jadwal, gaya_try_on, pengingat_terkirim_at)
  SELECT r.code, cu.id_customer, ca.id_capster,
         CASE r.source WHEN 'walk-in' THEN 'walk_in' ELSE 'online' END,
         r.starts_at::date, r.starts_at::time, r.ends_at::time,
         CASE r.status WHEN 'confirmed' THEN 'dikonfirmasi' WHEN 'completed' THEN 'selesai' WHEN 'cancelled' THEN 'dibatalkan' ELSE 'tidak_hadir' END,
         r.price, 0, r.created_at,
         CASE WHEN r.status = 'cancelled' THEN 'Dibatalkan oleh pelanggan' END,
         r.reschedule_count, r.hairstyle, r.reminder_sent_at
  FROM reservations r
  JOIN customer cu ON cu.no_whatsapp = r.customer_phone
  JOIN capster ca ON ca.slug = r.barber_id
  ON CONFLICT (kode_booking) DO NOTHING;

  INSERT INTO booking_layanan (id_booking, id_layanan, harga_satuan, subtotal)
  SELECT b.id_booking, l.id_layanan, r.price, r.price
  FROM reservations r
  JOIN booking b ON b.kode_booking = r.code
  JOIN layanan l ON l.slug = r.service_id
  WHERE NOT EXISTS (SELECT 1 FROM booking_layanan bl WHERE bl.id_booking = b.id_booking);

  INSERT INTO notifikasi_whatsapp (id_booking, no_tujuan, jenis_pesan, status_kirim, waktu_kirim, pesan, percobaan, error_terakhir, ref_penyedia, jadwal_kirim)
  SELECT b.id_booking, n.recipient,
         CASE n.kind WHEN 'created' THEN 'bukti_booking' WHEN 'rescheduled' THEN 'jadwal_diubah' WHEN 'cancelled' THEN 'pembatalan' ELSE 'pengingat' END,
         CASE n.status WHEN 'sent' THEN 'terkirim' WHEN 'failed' THEN 'gagal' ELSE 'menunggu' END,
         n.sent_at, n.message, n.attempts, n.last_error, n.provider_ref, n.next_attempt_at
  FROM notifications n
  JOIN reservations r ON r.id = n.reservation_id
  JOIN booking b ON b.kode_booking = r.code;

  UPDATE settings SET value = COALESCE((SELECT value FROM settings WHERE key = 'max_active_per_email'), '3') WHERE key = 'max_active_per_customer';
END $$;

-- ---------- 5. Menghapus tabel dobel ----------
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS haircuts;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS barbers;
DELETE FROM settings WHERE key = 'max_active_per_email';
