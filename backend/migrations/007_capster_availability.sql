-- Saklar "tersedia / tidak tersedia" untuk capster, supaya admin bisa mengubahnya dari web internal.
--   capster.status_aktif = false  -> capster diarsipkan: tidak tampil sama sekali di web customer.
--   capster.tersedia     = false  -> capster tetap tampil di web customer tetapi abu-abu, bertulis "Tidak tersedia",
--                                    tidak bisa dipilih, dan tidak ikut "Siapa saja". Cocok untuk cuti atau sakit tanpa tanggal pasti.
-- Hanya MENAMBAH kolom; baris yang sudah ada otomatis tersedia. Booking yang sudah ada tidak diubah.
ALTER TABLE capster ADD COLUMN IF NOT EXISTS tersedia boolean NOT NULL DEFAULT true;
