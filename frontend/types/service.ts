export type Service = {
  id: string
  name: string
  description: string
  /** Harga dalam Rupiah. */
  price: number
  /** Durasi layanan dalam menit. */
  durationMinutes: number
}
