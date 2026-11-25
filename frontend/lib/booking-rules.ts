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
  return reservation.status === 'cancelled'
}

/** Reservasi yang masih bisa diubah atau dibatalkan pelanggan (belum dibatalkan, selesai, atau tidak datang). */
export function isReservationActive(reservation: Reservation): boolean {
  return reservation.status === 'confirmed'
}

/** Apakah jadwal reservasi ini sudah lewat (menurut jam perangkat; backend yang memutuskan di akhir). */
export function isReservationPast(reservation: Reservation): boolean {
  const [hours, minutes] = reservation.time.split(':').map(Number)
  const start = fromIsoDate(reservation.date)
  start.setHours(hours, minutes, 0, 0)
  return start.getTime() <= Date.now()
}
