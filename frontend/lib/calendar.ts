import { fromIsoDate } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

const pad = (value: number) => String(value).padStart(2, '0')

/** Format tanggal-waktu lokal untuk iCalendar, contoh: 20241029T120000. */
function toIcsLocal(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
}

/** Membuat isi file .ics (kalender) dari sebuah reservasi. */
export function buildReservationIcs(reservation: Reservation): string {
  const [hours, minutes] = reservation.time.split(':').map(Number)
  const start = fromIsoDate(reservation.date)
  start.setHours(hours, minutes, 0, 0)
  const end = new Date(start.getTime() + (reservation.reservedMinutes ?? reservation.durationMinutes) * 60_000)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pit Stop Barbershop//Reservasi//ID',
    'BEGIN:VEVENT',
    `UID:${reservation.code}@pitstop-barbershop`,
    `DTSTAMP:${toIcsLocal(new Date())}`,
    `DTSTART:${toIcsLocal(start)}`,
    `DTEND:${toIcsLocal(end)}`,
    `SUMMARY:${reservation.serviceName} - Pit Stop Barbershop`,
    `DESCRIPTION:Kode reservasi ${reservation.code}. Kapster: ${reservation.barberName}. Check-in maks. 10 menit sebelum jadwal.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/** Memicu unduhan file .ics di browser. */
export function downloadReservationIcs(reservation: Reservation): void {
  const blob = new Blob([buildReservationIcs(reservation)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reservasi-${reservation.code}.ics`
  link.click()
  URL.revokeObjectURL(url)
}
