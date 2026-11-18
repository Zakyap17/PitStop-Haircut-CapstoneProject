# PitStop Haircut - Capstone Project

Aplikasi booking potong rambut. Monorepo berisi:

- `frontend/` - Next.js (TypeScript, Tailwind CSS)
- `backend/` - Express (Node.js)

## Menjalankan Project

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Berjalan di http://localhost:3000

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
Berjalan di http://localhost:4000

## Coba di HP (jaringan Wi-Fi yang sama)

```bash
cd frontend
npm run dev:lan
```

Perintah ini mencetak alamat seperti `http://192.168.x.x:3000`. Ketik alamat Wi-Fi itu di browser HP
(HP dan komputer harus di Wi-Fi yang sama). Abaikan alamat adapter virtual (VirtualBox, VPN/Tailscale).

**Kalau HP tidak bisa membuka**, Windows Firewall biasanya memblokir koneksi masuk. Buka PowerShell
**sebagai Administrator** lalu jalankan (hanya mengizinkan perangkat di jaringan lokal yang sama):

```powershell
New-NetFirewallRule -DisplayName "Next.js dev 3000 (jaringan lokal)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any -RemoteAddress LocalSubnet
```

Untuk menutupnya lagi setelah selesai: `Remove-NetFirewallRule -DisplayName "Next.js dev 3000 (jaringan lokal)"`.
Cara lain: saat Windows menanyakan akses untuk Node.js, centang jaringan yang dipakai (Private/Public).

**Kamera langsung di Try-On butuh HTTPS**, jadi lewat `http://192.168...` tombol "Nyalakan kamera" menampilkan
pesan dan tidak aktif. Tombol "Unggah foto" tetap bisa dipakai (HP menawarkan "Ambil foto"). Untuk menguji
kamera di HP, buka versi yang sudah di-deploy (HTTPS) atau pakai tunnel HTTPS; untuk tunnel, tambahkan domainnya
ke `allowedDevOrigins` di `frontend/next.config.mjs`.

## Kolaborasi

Untuk coding bareng secara real-time, gunakan extension **Live Share** di VS Code:
1. Install extension "Live Share" (Microsoft)
2. Buka folder ini di VS Code
3. Command Palette -> "Live Share: Start Collaboration Session"
4. Bagikan link yang muncul ke teman satu tim
