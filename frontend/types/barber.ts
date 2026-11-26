export type Barber = {
  id: string
  name: string
  role: string
  specialty: string
  /** Lama pengalaman (tahun); null kalau belum diisi di database. */
  experienceYears: number | null
  /** Hari libur, 0 = Minggu ... 6 = Sabtu (sesuai Date.getDay()). */
  offDays: number[]
  /** Alamat foto capster (bisa lewat /api/barbers/:id/photo); null = belum ada foto, tampilkan inisial. */
  photo: string | null
  /** Saklar dari admin: false = tetap tampil tetapi abu-abu dan tidak bisa dipilih (cuti, sakit). */
  available: boolean
}
