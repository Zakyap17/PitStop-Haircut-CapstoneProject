import type { Barber } from '@/types/barber'
import type { Haircut } from '@/types/haircut'
import type { Service } from '@/types/service'
import type { Testimonial } from '@/types/testimonial'

/** Aturan reservasi dari server (diatur admin di tabel settings). */
export type BookingRules = {
  timezone: string
  opensAt: string
  closesAt: string
  breakFrom: string | null
  breakTo: string | null
  /** Berapa hari ke depan (termasuk hari ini) yang bisa dipesan. */
  daysAhead: number
  maxReschedules: number
  timeSlots: string[]
}

/** Semua data yang dipakai halaman customer, diambil dari backend lewat GET /api/catalog. */
export type Catalog = {
  services: Service[]
  barbers: Barber[]
  haircuts: Haircut[]
  testimonials: Testimonial[]
  booking: BookingRules
}

export type AvailabilitySlot = {
  time: string
  /** Id kapster yang bisa melayani jam ini; kosong = penuh. */
  barbers: string[]
}

export type Availability = {
  date: string
  serviceId: string
  durationMinutes: number
  /** Waktu yang ditahan (menit): durasi dibulatkan ke atas ke kelipatan satu slot. */
  reservedMinutes: number
  /** Jumlah slot berurutan yang terpakai (hair coloring 90 menit = 2 slot per jam). */
  slotsNeeded: number
  slots: AvailabilitySlot[]
}
