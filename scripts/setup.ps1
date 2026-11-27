# Menyiapkan berkas .env untuk menjalankan Pit Stop dengan Docker di Windows PowerShell.
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
# Aman dijalankan berulang: berkas .env yang sudah ada tidak ditimpa.
# Setelah ini: isi DATABASE_URL di backend\.env, lalu `docker compose up -d --build`.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function New-RandomSecret {
  $bytes = New-Object 'System.Byte[]' 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
}

# Mengubah akhir baris CRLF menjadi LF (CRLF membuat nilai di .env membawa karakter CR saat dibaca Docker).
function ConvertTo-LfFile([string]$File) {
  $path = (Resolve-Path $File).Path
  $text = [System.IO.File]::ReadAllText($path)
  if ($text.Contains("`r`n")) {
    [System.IO.File]::WriteAllText($path, $text.Replace("`r`n", "`n"), $Utf8NoBom)
    Write-Host "Dirapikan: $File (akhir baris CRLF diubah ke LF)"
  }
}

# Mengisi KEY=nilai hanya kalau KEY itu sekarang kosong. Ditulis UTF-8 tanpa BOM dengan akhir baris LF.
function Set-EnvIfEmpty([string]$File, [string]$Key, [string]$Value) {
  $path = (Resolve-Path $File).Path
  $text = [System.IO.File]::ReadAllText($path)
  $pattern = "(?m)^$Key=$"
  if ($text -match $pattern) {
    [System.IO.File]::WriteAllText($path, [regex]::Replace($text, $pattern, "$Key=$Value"), $Utf8NoBom)
  }
}

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host 'Dibuat   : .env (port dan alamat situs untuk Docker Compose)'
} else { Write-Host 'Dilewati : .env sudah ada' }
ConvertTo-LfFile .env

if (-not (Test-Path backend\.env)) {
  Copy-Item backend\.env.example backend\.env
  ConvertTo-LfFile backend\.env
  Set-EnvIfEmpty backend\.env 'JWT_SECRET' (New-RandomSecret)
  Write-Host 'Dibuat   : backend\.env (JWT_SECRET sudah diisi otomatis)'
} else {
  ConvertTo-LfFile backend\.env
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
