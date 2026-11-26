import { addMinutesToTime, formatRupiah, fromIsoDate } from '@/lib/format'
import { buildQrMatrix, QR_QUIET_ZONE } from '@/lib/qr'
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

/**
 * Menggambar e-tiket menjadi gambar PNG, dengan susunan yang sama seperti tiket di layar: tanggal dan jam paling besar,
 * rincian, ringkasan pembayaran, garis kotak-kotak, lalu stub berisi kode dan QR. Tanpa library: dilukis langsung di canvas.
 */
export async function renderReservationImage(reservation: Reservation): Promise<Blob> {
  const display = resolveFontFamily('font-display')
  const sans = resolveFontFamily('font-sans')
  // Pastikan font sudah terunduh sebelum dilukis, kalau tidak teks memakai font cadangan.
  await Promise.all([
    document.fonts.load(`80px ${display}`),
    document.fonts.load(`600 30px ${sans}`),
    document.fonts.load(`400 26px ${sans}`),
    document.fonts.load(`500 20px ${sans}`),
  ])
  const logo = await loadImage('/images/brand/logo-mark.png')

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')

  const awaitingDp = reservation.status === 'menunggu_pembayaran'
  const date = fromIsoDate(reservation.date)
  const weekday = date.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase()
  const fullDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const endTime = addMinutesToTime(reservation.time, reservation.durationMinutes)
  const hasDp = reservation.dp.nominal > 0

  ctx.fillStyle = COLORS.page
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const cardX = 60
  const cardY = 60
  const cardW = WIDTH - 120
  const cardH = HEIGHT - 120
  const splitX = cardX + cardW - 520
  const left = cardX + 64
  const right = splitX - 64

  const label = (text: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
    ctx.textAlign = align
    ctx.fillStyle = COLORS.muted
    ctx.font = `500 19px ${sans}`
    ctx.letterSpacing = '4px'
    ctx.fillText(text.toUpperCase(), align === 'right' ? x + 4 : x, y)
    ctx.letterSpacing = '0px'
  }
  const value = (text: string, x: number, y: number, maxWidth: number, align: CanvasTextAlign = 'left') => {
    ctx.textAlign = align
    ctx.fillStyle = COLORS.text
    ctx.font = `600 32px ${sans}`
    ctx.fillText(text, x, y, maxWidth)
  }
  const note = (text: string, x: number, y: number, color: string = COLORS.muted, align: CanvasTextAlign = 'left') => {
    ctx.textAlign = align
    ctx.fillStyle = color
    ctx.font = `400 24px ${sans}`
    ctx.fillText(text, x, y)
  }

  // kartu
  roundedRect(ctx, cardX, cardY, cardW, cardH, 44)
  ctx.fillStyle = COLORS.card
  ctx.fill()

  // ringkasan pembayaran dan garis kotak-kotak di dalam kartu (dipotong mengikuti sudut membulat)
  ctx.save()
  roundedRect(ctx, cardX, cardY, cardW, cardH, 44)
  ctx.clip()
  // kotak-kotak besar samar yang memudar ke kiri bawah, seperti di tiket layar
  const fade = ctx.createLinearGradient(splitX, cardY, cardX, cardY + cardH)
  fade.addColorStop(0, 'rgba(243, 241, 234, 0.07)')
  fade.addColorStop(0.7, 'rgba(243, 241, 234, 0)')
  const big = 64
  for (let y = cardY, row = 0; y < cardY + cardH; y += big, row++) {
    for (let x = cardX + ((row % 2) * big); x < splitX; x += big * 2) {
      ctx.fillStyle = fade
      ctx.fillRect(x, y, big, big)
    }
  }
  // stub sedikit lebih terang
  ctx.fillStyle = 'rgba(243, 241, 234, 0.04)'
  ctx.fillRect(splitX, cardY, cardX + cardW - splitX, cardH)
  // pita garis finish di tepi atas
  const flag = 28
  for (let x = cardX, column = 0; x < cardX + cardW; x += flag, column++) {
    for (let r = 0; r < 2; r++) {
      ctx.fillStyle = (column + r) % 2 === 0 ? '#f4f1ea' : COLORS.card
      ctx.fillRect(x, cardY + r * (flag / 2), flag, flag / 2)
    }
  }
  const bandTop = cardY + cardH - 140
  ctx.fillStyle = 'rgba(243, 241, 234, 0.04)'
  ctx.fillRect(cardX, bandTop, splitX - cardX, 126)
  ctx.fillStyle = COLORS.border
  ctx.fillRect(cardX, bandTop, splitX - cardX, 2)
  ctx.restore()

  roundedRect(ctx, cardX, cardY, cardW, cardH, 44)
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 3
  ctx.stroke()

  // garis sobekan dan takik
  ctx.save()
  ctx.setLineDash([14, 12])
  ctx.strokeStyle = '#2c4666'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(splitX, cardY + 40)
  ctx.lineTo(splitX, cardY + cardH - 40)
  ctx.stroke()
  ctx.restore()
  for (const y of [cardY, cardY + cardH]) {
    ctx.beginPath()
    ctx.arc(splitX, y, 28, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.page
    ctx.fill()
    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // merek
  ctx.save()
  ctx.beginPath()
  ctx.arc(left + 36, cardY + 82, 36, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(logo, left, cardY + 46, 72, 72)
  ctx.restore()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.text
  ctx.font = `40px ${display}`
  ctx.fillText('PIT STOP', left + 92, cardY + 80)
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 17px ${sans}`
  ctx.letterSpacing = '4px'
  ctx.fillText('MEN & KIDS', left + 94, cardY + 106)
  ctx.letterSpacing = '0px'
  label('E-tiket', right, cardY + 88, 'right')

  // tanggal dan jam: informasi terpenting, paling besar
  label('Tanggal', left, cardY + 160)
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.text
  ctx.font = `88px ${display}`
  ctx.fillText(weekday, left, cardY + 266)
  note(fullDate, left, cardY + 308)
  label('Jam', right, cardY + 160, 'right')
  ctx.textAlign = 'right'
  ctx.fillStyle = COLORS.text
  ctx.font = `88px ${display}`
  ctx.fillText(reservation.time.replace(':', '.'), right, cardY + 266)
  note(`s/d ${endTime.replace(':', '.')} WIB`, right, cardY + 308, COLORS.muted, 'right')

  ctx.fillStyle = COLORS.border
  ctx.fillRect(left, cardY + 338, right - left, 2)

  // rincian
  const columnTwo = left + (right - left) / 2 + 20
  const columnWidth = (right - left) / 2 - 40
  label('Layanan', left, cardY + 382)
  value(reservation.serviceName, left, cardY + 416, columnWidth)
  note(`${reservation.durationMinutes} menit`, left, cardY + 444)
  label('Kapster', columnTwo, cardY + 382)
  value(reservation.barberName, columnTwo, cardY + 416, columnWidth)
  label('Atas nama', left, cardY + 484)
  value(reservation.customerName, left, cardY + 518, columnWidth)
  if (reservation.hairstyle) {
    label('Gaya pilihan', columnTwo, cardY + 484)
    value(reservation.hairstyle, columnTwo, cardY + 518, columnWidth)
  }

  // ringkasan pembayaran
  const span = right - left
  label('Total', left, bandTop + 36)
  value(formatRupiah(reservation.price), left, bandTop + 74, span / 3)
  if (hasDp) {
    const dpPaid = reservation.dp.status === 'dibayar'
    label('DP', left + span / 3, bandTop + 36)
    value(formatRupiah(reservation.dp.nominal), left + span / 3, bandTop + 74, span / 3)
    note(dpPaid ? 'sudah dibayar' : 'belum dibayar', left + span / 3, bandTop + 104, dpPaid ? '#6ee7b7' : '#fcd34d')
    label('Sisa', left + (span * 2) / 3, bandTop + 36)
    value(formatRupiah(reservation.price - reservation.dp.nominal), left + (span * 2) / 3, bandTop + 74, span / 3)
    note('dibayar di kasir', left + (span * 2) / 3, bandTop + 104)
  } else {
    label('Pembayaran', left + span / 3, bandTop + 36)
    value('Di kasir', left + span / 3, bandTop + 74, span / 3)
  }

  // stub: kode booking dan QR (isi QR = kode booking)
  const centerX = splitX + (cardX + cardW - splitX) / 2
  label('Kode booking', centerX, cardY + 120, 'center')
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.text
  ctx.font = `104px ${display}`
  ctx.letterSpacing = '6px'
  ctx.fillText(reservation.code, centerX + 3, cardY + 232)
  ctx.letterSpacing = '0px'

  const matrix = buildQrMatrix(reservation.code)
  const qrSize = 250
  const qrX = centerX - qrSize / 2
  const qrY = cardY + 272
  const unit = qrSize / (matrix.length + QR_QUIET_ZONE * 2)
  ctx.save()
  if (awaitingDp) ctx.globalAlpha = 0.3
  ctx.fillStyle = '#f4f1ea'
  roundedRect(ctx, qrX, qrY, qrSize, qrSize, 18)
  ctx.fill()
  ctx.fillStyle = COLORS.page
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      // Sedikit melebihi 1 piksel agar tidak ada garis tipis antar modul.
      if (dark) ctx.fillRect(qrX + (x + QR_QUIET_ZONE) * unit, qrY + (y + QR_QUIET_ZONE) * unit, unit + 0.6, unit + 0.6)
    }),
  )
  ctx.restore()

  note(awaitingDp ? 'QR aktif setelah DP dikonfirmasi admin.' : 'Tunjukkan ke kasir.', centerX, qrY + qrSize + 44, COLORS.muted, 'center')
  if (!awaitingDp) note('Check-in maks. 10 menit sebelum jadwal.', centerX, qrY + qrSize + 78, COLORS.muted, 'center')

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
