#!/usr/bin/env sh
# Cadangan database ke berkas .sql.gz memakai pg_dump di container sementara (tanpa memasang PostgreSQL di server).
#   ./scripts/backup-db.sh            -> cadangan/pitstop-YYYYmmdd-HHMMSS.sql.gz
# Jadwal harian (cron di server):  0 3 * * *  cd /path/ke/PitStop && ./scripts/backup-db.sh
# Membaca DATABASE_URL dari backend/.env. Cadangan berisi data pelanggan: simpan di tempat yang aman, jangan di-commit.
set -eu

cd "$(dirname "$0")/.."
[ -f backend/.env ] || { echo "backend/.env tidak ditemukan." >&2; exit 1; }

DATABASE_URL=$(grep -E '^DATABASE_URL=' backend/.env | head -1 | cut -d= -f2-)
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL kosong di backend/.env." >&2; exit 1; }

mkdir -p cadangan
OUT="cadangan/pitstop-$(date +%Y%m%d-%H%M%S).sql.gz"

# Versi klien harus sama atau lebih baru dari versi server database.
docker run --rm postgres:17-alpine pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$OUT"

[ -s "$OUT" ] || { rm -f "$OUT"; echo "Cadangan gagal (berkas kosong)." >&2; exit 1; }
echo "Cadangan tersimpan: $OUT ($(du -h "$OUT" | cut -f1))"

# Simpan 14 cadangan terakhir.
ls -1t cadangan/pitstop-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
