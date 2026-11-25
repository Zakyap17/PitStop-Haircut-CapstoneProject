export type ReservationStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'

/** Reservasi seperti yang dikirim backend. */
export type Reservation = {
  code: string
  serviceId: string
  serviceName: string
  durationMinutes: number
  /** Tanggal reservasi dalam format ISO (YYYY-MM-DD). */
  date: string
  time: string
  barberId: string
  barberName: string
  customerName: string
  customerEmail: string
  price: number
  /** Gaya rambut pilihan dari Virtual Try-On (opsional). */
  hairstyle?: string
  /** Berapa kali jadwal sudah diubah (kosong = belum pernah). */
  rescheduleCount?: number
  status: ReservationStatus
  /** Pengiriman invoice ke WhatsApp. `to` sudah disamarkan; null kalau reservasi tanpa nomor (data lama). */
  invoice: { to: string; status: 'pending' | 'sent' | 'failed' } | null
}
