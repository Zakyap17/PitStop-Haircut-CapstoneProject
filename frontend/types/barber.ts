export type Barber = {
  name: string
  role: string
  specialty: string
  experienceYears: number
  /** Hari libur, 0 = Minggu ... 6 = Sabtu (sesuai Date.getDay()). */
  offDays: number[]
}
