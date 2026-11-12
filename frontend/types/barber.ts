export type Barber = {
  name: string
  role: string
  experienceYears: number
  specialty: string
  /** Hari libur, 0 = Minggu ... 6 = Sabtu (sesuai Date.getDay()). */
  dayOff: number
  dayOffLabel: string
}
