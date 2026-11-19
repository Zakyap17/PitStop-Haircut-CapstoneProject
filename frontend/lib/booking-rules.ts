import { BOOKING_DAYS_AHEAD } from '@/data/booking-slots'
import { fromIsoDate, toIsoDate } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

/** Berapa kali jadwal satu reservasi boleh diubah. Backend nanti yang menegakkan aturan aslinya. */
export const MAX_RESCHEDULES = 2

/** Hari yang bisa dipesan, mulai dari hari ini. */
export function buildBookableDays(): Date[] {
  const today = new Date()
  return Array.from({ length: BOOKING_DAYS_AHEAD }, (_, offset) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset))
}

/** Slot hari ini yang jamnya sudah lewat tidak boleh dipilih. */
export function isSlotInPast(day: Date, slot: string): boolean {
  const now = new Date()
  if (toIsoDate(day) !== toIsoDate(now)) return false
  const [hours, minutes] = slot.split(':').map(Number)
  return hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes()
}

export function isReservationCancelled(reservation: Reservation): boolean {
  return reservation.status === 'cancelled'
}

/** Apakah jadwal reservasi ini sudah lewat (tidak bisa diubah lagi). */
export function isReservationPast(reservation: Reservation): boolean {
  const [hours, minutes] = reservation.time.split(':').map(Number)
  const start = fromIsoDate(reservation.date)
  start.setHours(hours, minutes, 0, 0)
  return start.getTime() <= Date.now()
}
