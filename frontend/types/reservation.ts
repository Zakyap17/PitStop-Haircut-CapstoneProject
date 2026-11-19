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
  /** Gaya rambut pilihan dari Virtual Try-On (opsional). */
  hairstyle?: string
  /** Berapa kali jadwal sudah diubah (kosong = belum pernah). */
  rescheduleCount?: number
}
