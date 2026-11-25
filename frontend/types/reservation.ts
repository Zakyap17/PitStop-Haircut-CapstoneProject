/** Status booking (nilai tabel booking.status_booking, lihat docs/kontrak-data-dan-use-case.md). */
export type ReservationStatus = 'menunggu_pembayaran' | 'dikonfirmasi' | 'sedang_dilayani' | 'selesai' | 'dibatalkan' | 'tidak_hadir'

/** Booking seperti yang dikirim backend. */
export type Reservation = {
  code: string
  serviceId: string | null
  serviceName: string
  durationMinutes: number
  /** Tanggal booking dalam format ISO (YYYY-MM-DD). */
  date: string
  time: string
  barberId: string
  barberName: string
  customerName: string
  /** Nomor WhatsApp pemesan (format 62...). Dipakai sebagai kunci untuk cek, ubah, dan batal. */
  customerPhone: string
  price: number
  /** Gaya rambut pilihan dari Virtual Try-On (opsional). */
  hairstyle?: string
  /** Berapa kali jadwal sudah diubah. */
  rescheduleCount: number
  status: ReservationStatus
  /** Uang muka: nominal, status pembayarannya, batas bayar (hanya saat menunggu), dan cara bayar dari toko. */
  dp: { nominal: number; status: 'menunggu' | 'dibayar' | 'gagal' | 'kedaluwarsa' | null; payBefore: string | null; instruction: string | null }
  /** Pesan WhatsApp terakhir untuk booking ini. `to` sudah disamarkan. */
  whatsapp: { to: string; status: 'pending' | 'sent' | 'failed' } | null
}
