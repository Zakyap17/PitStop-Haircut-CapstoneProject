import { fromIsoDate } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

/**
 * Aturan yang hanya untuk tampilan. Aturan sebenarnya (jam buka, istirahat, bentrok, batas ubah jadwal)
 * ditegakkan backend; frontend hanya menyembunyikan pilihan yang pasti ditolak.
 */

/** Hari yang bisa dipesan: `count` hari mulai dari hari ini. */
export function buildBookableDays(count: number): Date[] {
  const today = new Date()
  return Array.from({ length: count }, (_, offset) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset))
}

export function isReservationCancelled(reservation: Reservation): boolean {
  return reservation.status === 'dibatalkan'
}

/** Masih menunggu DP dibayar (slot ditahan sampai batas waktu). */
export function isAwaitingDp(reservation: Reservation): boolean {
  return reservation.status === 'menunggu_pembayaran'
}

/** Booking yang jadwalnya masih bisa diubah pelanggan (menunggu DP atau sudah dikonfirmasi). */
export function isReservationActive(reservation: Reservation): boolean {
  return reservation.status === 'menunggu_pembayaran' || reservation.status === 'dikonfirmasi'
}

/** Apakah jadwal reservasi ini sudah lewat (menurut jam perangkat; backend yang memutuskan di akhir). */
export function isReservationPast(reservation: Reservation): boolean {
  const [hours, minutes] = reservation.time.split(':').map(Number)
  const start = fromIsoDate(reservation.date)
  start.setHours(hours, minutes, 0, 0)
  return start.getTime() <= Date.now()
}
