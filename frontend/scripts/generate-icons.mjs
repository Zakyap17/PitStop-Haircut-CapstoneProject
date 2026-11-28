// Membuat ikon situs dari logo badge Pit Stop: node scripts/generate-icons.mjs
//
// Sumber (public/images/brand/logo-mark.png) adalah kotak hitam penuh tanpa transparansi dengan badge bulat di dalamnya. Dipakai
// langsung sebagai favicon, empat sudut hitamnya muncul sebagai kotak hitam di tab browser dan layar utama. Skrip ini memotongnya
// menjadi lingkaran transparan dan menulis berkas yang dikenali Next.js lewat konvensi nama di app/:
//   app/icon.png        ikon bulat transparan 256 px (tab browser, hasil pencarian)
//   app/favicon.ico     16, 32, 48 px untuk browser lama dan tab kecil
//   app/apple-icon.png  180 px, latar navy penuh karena iOS mengisi transparansi dengan hitam (sudutnya dibulatkan iOS sendiri)
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public/images/brand/logo-mark.png')
const NAVY = '#091c33'

const meta = await sharp(source).metadata()
const size = Math.min(meta.width, meta.height) // 225
// Lingkaran badge menyentuh tepi gambar; dipotong sedikit ke dalam supaya tidak ada sisa pinggir hitam.
const radius = size / 2 - 1

/** Badge bulat transparan dengan sisi `px`. */
async function roundBadge(px) {
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="#fff"/></svg>`)
  // Dua tahap: sharp melakukan resize sebelum composite, jadi potong bulat di ukuran asli dulu, baru diperkecil.
  const cut = await sharp(source).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  return sharp(cut).resize(px, px, { kernel: 'lanczos3' }).png().toBuffer()
}

// 1. app/icon.png
// Palet warna terbatas (badge hanya beberapa warna) memangkas ukuran berkas beberapa kali lipat tanpa terlihat bedanya.
writeFileSync(join(root, 'app/icon.png'), await sharp(await roundBadge(256)).png({ palette: true, quality: 95, effort: 10 }).toBuffer())

// 2. app/favicon.ico (PNG di dalam ICO, didukung semua browser modern)
const sizes = [16, 32, 48]
const images = await Promise.all(sizes.map((px) => roundBadge(px)))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2) // tipe 1 = ikon
header.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const entries = images.map((data, i) => {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(sizes[i], 0) // lebar
  entry.writeUInt8(sizes[i], 1) // tinggi
  entry.writeUInt16LE(1, 4) // planes
  entry.writeUInt16LE(32, 6) // bit per piksel
  entry.writeUInt32LE(data.length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += data.length
  return entry
})
writeFileSync(join(root, 'app/favicon.ico'), Buffer.concat([header, ...entries, ...images]))

// 3. app/apple-icon.png: badge 148 px di tengah latar navy 180 px
const badge = await roundBadge(148)
await sharp({ create: { width: 180, height: 180, channels: 4, background: NAVY } })
  .composite([{ input: badge, top: 16, left: 16 }])
  .flatten({ background: NAVY })
  .png({ palette: true, quality: 95, effort: 10 })
  .toFile(join(root, 'app/apple-icon.png'))

console.log('Ikon dibuat: app/icon.png, app/favicon.ico, app/apple-icon.png')
