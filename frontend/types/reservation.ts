export type Reservation = {
  code: string
  serviceName: string
  durationMinutes: number
  /** Tanggal reservasi dalam format ISO (YYYY-MM-DD). */
  date: string
  time: string
  barberName: string
  customerName: string
  customerEmail: string
  price: number
}
