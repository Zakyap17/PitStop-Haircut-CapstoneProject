-- Verifikasi OTP WhatsApp sebelum booking dibuat. Tabel resmi otp_riwayat (ERD) sudah punya hash kode, waktu kedaluwarsa dan
-- status terpakai. Hanya MENAMBAH dua kolom yang dibutuhkan untuk membatasi penyalahgunaan:
--   percobaan   : berapa kali kode salah dimasukkan (kode dikunci setelah 5 kali)
--   dibuat_pada : kapan kode diminta (untuk jeda kirim ulang dan batas permintaan per nomor)
ALTER TABLE otp_riwayat
  ADD COLUMN IF NOT EXISTS percobaan integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dibuat_pada timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS otp_riwayat_customer_dibuat ON otp_riwayat (id_customer, dibuat_pada DESC);
