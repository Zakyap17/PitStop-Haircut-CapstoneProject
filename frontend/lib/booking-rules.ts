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

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** Panjang satu slot (menit): selisih terkecil antar jam mulai berurutan (slot per jam = 60). */
export function slotLengthMinutes(timeSlots: string[]): number {
  const starts = timeSlots.map(toMinutes).sort((a, b) => a - b)
  let smallest = Infinity
  for (let i = 1; i < starts.length; i += 1) if (starts[i] > starts[i - 1]) smallest = Math.min(smallest, starts[i] - starts[i - 1])
  return Number.isFinite(smallest) ? smallest : 60
}

/** Berapa slot yang terpakai oleh layanan berdurasi `durationMinutes` (dibulatkan ke atas). Sama dengan aturan di backend. */
export function slotsNeeded(durationMinutes: number, timeSlots: string[]): number {
  return Math.max(1, Math.ceil(durationMinutes / slotLengthMinutes(timeSlots)))
}

/** Jam-jam slot yang ikut tertahan kalau booking dimulai pukul `time` dan butuh `count` slot (termasuk jam mulainya). */
export function slotsCovered(time: string, count: number, timeSlots: string[]): string[] {
  const length = slotLengthMinutes(timeSlots)
  const start = toMinutes(time)
  return timeSlots.filter((slot) => {
    const at = toMinutes(slot)
    return at >= start && at < start + count * length
  })
}
