const LOCALE = 'id-ID'

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

/** Label chip hari di form reservasi, contoh: "Sel 29". */
export function formatDayChip(date: Date): string {
  const weekday = date.toLocaleDateString(LOCALE, { weekday: 'short' })
  return `${weekday} ${date.getDate()}`
}

/** Tanggal panjang untuk e-tiket, contoh: "Selasa, 29 Okt 2024". */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Date -> "YYYY-MM-DD" memakai zona waktu lokal (bukan UTC). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** "YYYY-MM-DD" -> Date pada tengah malam waktu lokal. */
export function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Rupiah tanpa spasi, gaya tabel admin: "Rp150.000". */
export function formatRupiahTight(value: number): string {
  return formatRupiah(value).replace(/\s/g, '')
}
