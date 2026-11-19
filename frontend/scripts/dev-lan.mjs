// Menjalankan server dev yang bisa dibuka dari HP/perangkat lain di jaringan yang sama,
// dan mencetak alamat yang bisa diketik di browser HP. Pakai: npm run dev:lan
import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'

const port = process.env.PORT ?? '3000'

const addresses = []
for (const [name, entries] of Object.entries(networkInterfaces())) {
  for (const entry of entries ?? []) {
    if (entry.family === 'IPv4' && !entry.internal) addresses.push({ name, address: entry.address })
  }
}

console.log('\nBuka dari HP (HP dan komputer harus di jaringan Wi-Fi yang sama):')
if (addresses.length === 0) console.log('  (tidak ada jaringan aktif yang terdeteksi)')
for (const { name, address } of addresses) console.log(`  http://${address}:${port}   <- ${name}`)
console.log('\nCatatan:')
console.log('  - Wi-Fi rumah/kantor biasanya 192.168.x.x atau 10.x.x.x. Abaikan alamat adapter virtual (VirtualBox, VPN).')
console.log('  - Kalau HP tidak bisa membuka, izinkan port ' + port + ' di Windows Firewall (lihat README bagian "Coba di HP").')
console.log('  - Lewat http, kamera langsung di Try-On tidak aktif (butuh HTTPS). Tombol "Unggah foto" tetap bisa memakai kamera HP.\n')

const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))
const child = spawn(process.execPath, [nextBin, 'dev', '-H', '0.0.0.0', '-p', port], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
