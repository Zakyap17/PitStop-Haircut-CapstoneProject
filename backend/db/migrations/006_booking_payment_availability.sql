ALTER TABLE capster
  ADD COLUMN IF NOT EXISTS tersedia boolean NOT NULL DEFAULT true;

ALTER TABLE transaksi
  ADD COLUMN IF NOT EXISTS uang_diterima numeric(14,2) NOT NULL DEFAULT 0 CHECK (uang_diterima >= 0),
  ADD COLUMN IF NOT EXISTS kembalian numeric(14,2) NOT NULL DEFAULT 0 CHECK (kembalian >= 0),
  ADD COLUMN IF NOT EXISTS waktu_lunas timestamptz;

ALTER TABLE notifikasi_whatsapp
  ALTER COLUMN id_booking DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS id_transaksi bigint REFERENCES transaksi(id_transaksi);

UPDATE transaksi SET status_transaksi='belum' WHERE status_transaksi='belum_lunas';
