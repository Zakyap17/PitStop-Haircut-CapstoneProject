import { formatLongDate, formatRupiah, fromIsoDate } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

/** Ukuran gambar e-tiket (px). Dua kali ukuran kartu di layar supaya tetap tajam saat dibuka di HP. */
const WIDTH = 1600
const HEIGHT = 820

const COLORS = {
  page: '#091c33',
  card: '#102b48',
  border: '#27496f',
  text: '#f4f1ea',
  muted: '#93a7c4',
  accent: '#5483ff',
}

/** Nama keluarga font yang dipakai situs untuk sebuah kelas Tailwind, dibaca dari elemen bayangan. */
function resolveFontFamily(className: string): string {
  const probe = document.createElement('span')
  probe.className = className
  probe.style.cssText = 'position:absolute;visibility:hidden'
  document.body.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily
  probe.remove()
  return family
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Gagal memuat ${src}`))
    image.src = src
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

/** Menggambar e-tiket menjadi gambar PNG. Tanpa library: dilukis langsung di canvas. */
export async function renderReservationImage(reservation: Reservation): Promise<Blob> {
  const display = resolveFontFamily('font-display')
  const sans = resolveFontFamily('font-sans')
  // Pastikan font sudah terunduh sebelum dilukis, kalau tidak teks memakai font cadangan.
  await Promise.all([document.fonts.load(`80px ${display}`), document.fonts.load(`600 30px ${sans}`), document.fonts.load(`400 26px ${sans}`)])
  const logo = await loadImage('/images/brand/logo-mark.png')

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')

  ctx.fillStyle = COLORS.page
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Kartu
  const cardX = 60
  const cardY = 60
  const cardW = WIDTH - 120
  const cardH = HEIGHT - 120
  const splitX = cardX + cardW - 520
  roundedRect(ctx, cardX, cardY, cardW, cardH, 48)
  ctx.fillStyle = COLORS.card
  ctx.fill()
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 3
  ctx.stroke()

  // Garis perforasi
  ctx.save()
  ctx.setLineDash([14, 12])
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(splitX, cardY + 40)
  ctx.lineTo(splitX, cardY + cardH - 40)
  ctx.stroke()
  ctx.restore()

  // Logo dan nama
  const left = cardX + 80
  ctx.save()
  ctx.beginPath()
  ctx.arc(left + 36, cardY + 100, 36, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(logo, left, cardY + 64, 72, 72)
  ctx.restore()
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLORS.text
  ctx.font = `40px ${display}`
  ctx.fillText('PIT STOP', left + 92, cardY + 98)
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 17px ${sans}`
  ctx.letterSpacing = '4px'
  ctx.fillText('MEN & KIDS', left + 94, cardY + 124)
  ctx.letterSpacing = '0px'

  // Baris detail
  const rows: [string, string][] = [
    ['Layanan', `${reservation.serviceName} · ${reservation.durationMinutes} menit`],
    ['Tanggal & jam', `${formatLongDate(fromIsoDate(reservation.date))} · ${reservation.time}`],
    ['Kapster', reservation.barberName],
    ['Atas nama', reservation.customerName],
    ...(reservation.hairstyle ? ([['Gaya pilihan', reservation.hairstyle]] as [string, string][]) : []),
    ['Dibayar di muka', formatRupiah(reservation.price)],
  ]
  const rowRight = splitX - 70
  const rowTop = cardY + 210
  const rowGap = Math.min(86, (cardH - 250) / rows.length)
  rows.forEach(([label, value], index) => {
    const y = rowTop + index * rowGap
    ctx.textAlign = 'left'
    ctx.fillStyle = COLORS.muted
    ctx.font = `400 28px ${sans}`
    ctx.fillText(label, left, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = COLORS.text
    ctx.font = `600 30px ${sans}`
    ctx.fillText(value, rowRight, y, rowRight - left - 220)
  })

  // Kode reservasi
  const centerX = splitX + (cardX + cardW - splitX) / 2
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 22px ${sans}`
  ctx.letterSpacing = '4px'
  ctx.fillText('KODE RESERVASI', centerX, cardY + cardH / 2 - 70)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = COLORS.accent
  ctx.font = `120px ${display}`
  ctx.fillText(reservation.code, centerX, cardY + cardH / 2 + 50)
  ctx.fillStyle = COLORS.muted
  ctx.font = `400 22px ${sans}`
  ctx.fillText('Tunjukkan kode ini ke kasir saat datang.', centerX, cardY + cardH / 2 + 110)
  ctx.fillText('Check-in maks. 10 menit sebelum jadwal.', centerX, cardY + cardH / 2 + 148)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar'))), 'image/png')
  })
}

function imageFileName(reservation: Reservation): string {
  return `e-tiket-${reservation.code}.png`
}

/** Mengunduh e-tiket sebagai gambar PNG. */
export async function downloadReservationImage(reservation: Reservation): Promise<void> {
  const blob = await renderReservationImage(reservation)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = imageFileName(reservation)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Apakah browser ini bisa membagikan file gambar lewat menu bagikan bawaan (umumnya HP). */
export function canShareImages(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  return navigator.canShare({ files: [new File([], 'tes.png', { type: 'image/png' })] })
}

/** Membagikan e-tiket lewat menu bagikan bawaan perangkat. Batal oleh pengguna bukan error. */
export async function shareReservationImage(reservation: Reservation): Promise<void> {
  const blob = await renderReservationImage(reservation)
  const file = new File([blob], imageFileName(reservation), { type: 'image/png' })
  try {
    await navigator.share({ files: [file], title: `E-tiket ${reservation.code}`, text: 'E-tiket reservasi Pit Stop Barbershop' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    throw error
  }
}
