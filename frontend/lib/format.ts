const LOCALE = 'id-ID'

/**
 * Format Rupiah: "Rp 50.000" (spasi tak terputus agar tidak pecah baris).
 * Ditulis manual, bukan Intl.NumberFormat, karena tiap mesin memformat mata uang sedikit berbeda
 * (Node memberi spasi, Safari iOS tidak) sehingga HTML server dan browser tidak cocok (hydration error).
 */
export function formatRupiah(value: number): string {
  const digits = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp\u00A0${digits}`
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
  return formatRupiah(value).replace(/\u00A0/g, '')
}
