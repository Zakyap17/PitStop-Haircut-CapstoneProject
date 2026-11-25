-- Pesan WhatsApp otomatis: invoice saat reservasi dibuat, kabar ubah/batal, dan pengingat sebelum jadwal.
-- Pesan ditulis dulu ke tabel notifications (antrean), lalu dikirim oleh worker di backend. Dengan begitu
-- pemesanan tetap cepat dan tidak gagal walau WhatsApp sedang bermasalah; pesan yang gagal dicoba lagi.

-- Kapan pengingat sudah dikirim (atau tidak perlu). Kosong = belum. Di-reset saat jadwal diubah.
ALTER TABLE reservations ADD COLUMN reminder_sent_at timestamptz;

CREATE TABLE notifications (
  id              bigserial PRIMARY KEY,
  reservation_id  uuid NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('created', 'rescheduled', 'cancelled', 'reminder')),
  channel         text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
  recipient       text NOT NULL,                  -- nomor format internasional tanpa "+", contoh 6281234567890
  message         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  provider_ref    text,                           -- id pesan dari penyedia WhatsApp, kalau ada
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);

CREATE INDEX notifications_due_idx ON notifications (next_attempt_at) WHERE status = 'pending';
CREATE INDEX notifications_reservation_idx ON notifications (reservation_id, kind);

INSERT INTO settings (key, value, description) VALUES
  ('shop_name',               'Pit Stop Barbershop',  'Nama toko di pesan WhatsApp'),
  ('shop_address',            'Jl. Leuwi Panjang, Situsaeur, Kec. Bojongloa Kidul, Kota Bandung, Jawa Barat 40235', 'Alamat di pesan WhatsApp'),
  ('shop_maps_url',           'https://maps.app.goo.gl/hhVQXvJ6JRuaVRMk6', 'Tautan Google Maps di pesan WhatsApp'),
  ('reminder_minutes_before', '120',                  'Pengingat dikirim berapa menit sebelum jadwal; 0 = tanpa pengingat');
