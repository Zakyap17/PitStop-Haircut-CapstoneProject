export type Barber = {
  id: string
  name: string
  role: string
  specialty: string
  experienceYears: number
  /** Hari libur, 0 = Minggu ... 6 = Sabtu (sesuai Date.getDay()). */
  offDays: number[]
}
