-- Mengunci semua tabel dari akses lewat API publik (Supabase membuka tabel di schema public lewat REST API).
-- Tabel berisi data pelanggan (email dan nomor HP di reservations), jadi tidak boleh terbaca tanpa lewat backend.
--
-- Backend terhubung sebagai pemilik database sehingga tidak terpengaruh (pemilik tabel melewati Row Level Security).
-- Di PostgreSQL biasa (VM sendiri, tanpa Supabase) migrasi ini tidak berbahaya: hanya menyalakan RLS tanpa kebijakan,
-- yang berarti pengguna selain pemilik tidak bisa membaca apa pun.
--
-- ATURAN UNTUK MIGRASI BERIKUTNYA: setiap tabel baru yang dibuat harus diikuti
--   ALTER TABLE nama_tabel ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;

  -- Hanya ada di Supabase: peran yang dipakai API publik.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
  END IF;
END $$;
