# Menyiapkan berkas .env untuk menjalankan Pit Stop dengan Docker di Windows PowerShell.
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
# Aman dijalankan berulang: berkas .env yang sudah ada tidak ditimpa.
# Setelah ini: isi DATABASE_URL di backend\.env, lalu `docker compose up -d --build`.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function New-RandomSecret {
  $bytes = New-Object 'System.Byte[]' 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
}

# Mengisi KEY=nilai hanya kalau KEY itu sekarang kosong. Ditulis UTF-8 tanpa BOM dengan akhir baris LF.
function Set-EnvIfEmpty([string]$File, [string]$Key, [string]$Value) {
  $text = [System.IO.File]::ReadAllText((Resolve-Path $File))
  $pattern = "(?m)^$Key=\r?$"
  if ($text -match $pattern) {
    $text = [regex]::Replace($text, $pattern, "$Key=$Value")
    [System.IO.File]::WriteAllText((Resolve-Path $File), $text, (New-Object System.Text.UTF8Encoding($false)))
  }
}

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host 'Dibuat   : .env (port dan alamat situs untuk Docker Compose)'
} else { Write-Host 'Dilewati : .env sudah ada' }

if (-not (Test-Path backend\.env)) {
  Copy-Item backend\.env.example backend\.env
  Set-EnvIfEmpty backend\.env 'JWT_SECRET' (New-RandomSecret)
  Write-Host 'Dibuat   : backend\.env (JWT_SECRET sudah diisi otomatis)'
} else {
  Set-EnvIfEmpty backend\.env 'JWT_SECRET' (New-RandomSecret)
  Write-Host 'Dilewati : backend\.env sudah ada'
}

$db = Select-String -Path backend\.env -Pattern '^DATABASE_URL=.+' -Quiet
if (-not $db) {
  Write-Host ''
  Write-Host 'LANGKAH BERIKUTNYA: isi DATABASE_URL di backend\.env'
  Write-Host '  Minta alamat database (Supabase) ke pemegang proyek, lalu tempel setelah "DATABASE_URL=".'
  Write-Host '  Berkas itu rahasia dan tidak ikut git. Setelah terisi, jalankan ulang skrip ini, lalu:'
  Write-Host ''
  Write-Host '    docker compose up -d --build'
  Write-Host '    docker compose ps          # tunggu ketiganya "healthy", lalu buka http://localhost:3000'
  Write-Host ''
  Write-Host '  Panduan lengkap: docs\deploy.md'
  exit 1
}

Write-Host ''
Write-Host 'Siap. Nyalakan dengan:'
Write-Host ''
Write-Host '  docker compose up -d --build'
Write-Host '  docker compose ps            # tunggu ketiganya "healthy", lalu buka http://localhost:3000'
Write-Host ''
Write-Host 'Catatan: kalau WHATSAPP_PROVIDER=console (bawaan), kode OTP tidak dikirim ke WhatsApp tapi dicetak di log:'
Write-Host '  docker compose logs -f api'
