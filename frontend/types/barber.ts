export type Barber = {
  id: string
  name: string
  role: string
  specialty: string
  /** Lama pengalaman (tahun); null kalau belum diisi di database. */
  experienceYears: number | null
  /** Hari libur, 0 = Minggu ... 6 = Sabtu (sesuai Date.getDay()). */
  offDays: number[]
}
