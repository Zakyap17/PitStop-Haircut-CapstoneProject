#!/usr/bin/env sh
# Menyiapkan berkas .env untuk menjalankan Pit Stop dengan Docker (Linux, macOS, atau Git Bash di Windows).
#   ./scripts/setup.sh
# Aman dijalankan berulang: berkas .env yang sudah ada tidak ditimpa.
# Setelah ini: isi DATABASE_URL di backend/.env, lalu `docker compose up -d --build`.
set -eu

cd "$(dirname "$0")/.."

random_secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 32
  elif command -v node >/dev/null 2>&1; then node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  else head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; fi
}

# Berkas .env berakhir baris CRLF (dibuat di Windows) membuat nilai membawa karakter CR: ubah jadi LF.
CR=$(printf '\r')
to_lf() {
  if [ -f "$1" ] && grep -q "$CR" "$1"; then
    sed -i.bak "s/${CR}\$//" "$1" && rm -f "$1.bak"
    echo "Dirapikan: $1 (akhir baris CRLF diubah ke LF)"
  fi
}

# Mengisi KEY=nilai di sebuah berkas .env hanya kalau KEY itu sekarang kosong.
fill_if_empty() {
  file=$1 key=$2 value=$3
  if grep -qE "^${key}=$" "$file"; then
    sed -i.bak "s|^${key}=$|${key}=${value}|" "$file" && rm -f "$file.bak"
  fi
}

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Dibuat   : .env (port dan alamat situs untuk Docker Compose)"
else
  echo "Dilewati : .env sudah ada"
fi
to_lf .env

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  to_lf backend/.env
  fill_if_empty backend/.env JWT_SECRET "$(random_secret)"
  echo "Dibuat   : backend/.env (JWT_SECRET sudah diisi otomatis)"
else
  to_lf backend/.env
  fill_if_empty backend/.env JWT_SECRET "$(random_secret)"
  echo "Dilewati : backend/.env sudah ada"
fi

if ! grep -qE '^DATABASE_URL=.+' backend/.env; then
  cat <<'EOF'

LANGKAH BERIKUTNYA: isi DATABASE_URL di backend/.env
  Minta alamat database (Supabase) ke pemegang proyek, lalu tempel setelah "DATABASE_URL=".
  Berkas itu rahasia dan tidak ikut git. Setelah terisi, jalankan ulang skrip ini untuk memastikan, lalu:

    docker compose up -d --build
    docker compose ps          # tunggu ketiganya "healthy", lalu buka http://localhost:3000

  Panduan lengkap: docs/deploy.md
EOF
  exit 1
fi

cat <<'EOF'

Siap. Nyalakan dengan:

  docker compose up -d --build
  docker compose ps            # tunggu ketiganya "healthy", lalu buka http://localhost:3000

Catatan: kalau WHATSAPP_PROVIDER=console (bawaan), kode OTP tidak dikirim ke WhatsApp tapi dicetak di log:
  docker compose logs -f api
EOF
