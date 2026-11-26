import type { EncodedImage } from '@/lib/image-encode'
import type { Availability } from '@/types/catalog'
import type { History, Reservation } from '@/types/reservation'
import type { FaceAnalysis } from '@/types/try-on'

/** Error dari backend: code dari API (mis. "slot_taken") dan pesan yang siap ditampilkan ke pengguna. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

const NETWORK_MESSAGE = 'Tidak bisa menghubungi server. Periksa koneksi internetmu lalu coba lagi.'

/**
 * Memanggil backend lewat alamat relatif /api/..., yang diteruskan Next ke backend (lihat rewrites di next.config.mjs).
 * Dengan begitu browser tidak perlu tahu alamat backend dan tidak ada urusan CORS.
 */
async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(0, 'network', NETWORK_MESSAGE)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, data?.error?.code ?? 'server_error', data?.error?.message ?? 'Terjadi kesalahan di server. Coba lagi sebentar lagi.')
  }
  return data as T
}

export type NewReservation = {
  serviceId: string
  /** Kosong atau "any" = tanpa preferensi capster. */
  barberId?: string
  date: string
  time: string
  customerName: string
  /** Nomor WhatsApp pemesan: kunci untuk cek, ubah, dan batal, juga tujuan pesan bukti booking dan invoice. */
  customerPhone: string
  hairstyle?: string
  /** Kode OTP 6 digit dari WhatsApp; wajib kalau backend mengaktifkan OTP. */
  otpCode?: string
}

export const api = {
  getAvailability: (date: string, serviceId: string) => request<Availability>('GET', `/api/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}`),

  /**
   * Meminta kode OTP 6 digit dikirim ke WhatsApp nomor itu. `to` adalah nomor yang sudah disamarkan. purpose "history" (nama tidak perlu) hanya
   * mengirim kode ke nomor yang pernah memesan, dan jawabannya sama untuk nomor lain supaya tidak membocorkan siapa pelanggan.
   */
  requestOtp: (input: { phone: string; customerName?: string; purpose?: 'booking' | 'history' }) =>
    request<{ to: string; expiresInSeconds: number; resendAfterSeconds: number }>('POST', '/api/otp/request', input),

  /** Riwayat booking milik satu nomor WhatsApp, dibuka dengan kode OTP (sekali pakai). */
  getHistory: (phone: string, otpCode: string) => request<History>('POST', '/api/history', { phone, otpCode }),

  createReservation: (input: NewReservation) => request<{ reservation: Reservation }>('POST', '/api/reservations', input).then((result) => result.reservation),

  lookupReservation: (code: string, phone: string) => request<{ reservation: Reservation }>('POST', '/api/reservations/lookup', { code, phone }).then((result) => result.reservation),

  rescheduleReservation: (code: string, input: { phone: string; barberId: string; date: string; time: string }) =>
    request<{ reservation: Reservation }>('POST', `/api/reservations/${encodeURIComponent(code)}/reschedule`, input).then((result) => result.reservation),

  /** Status try-on AI di backend: enabled = analisa wajah aktif, canGenerate = pasang gaya di foto juga aktif. */
  getTryOnStatus: () => request<{ enabled: boolean; canGenerate: boolean }>('GET', '/api/try-on/status'),

  /** Langkah 1 try-on: AI menilai wajah di foto dan memilih gaya galeri yang cocok. */
  analyzeFace: (photo: EncodedImage) => request<FaceAnalysis>('POST', '/api/try-on/analyze', { photo }),

  /** Langkah 2 try-on: meminta AI mengganti gaya rambut di foto. Mengembalikan gambar hasil sebagai data URL. Bisa memakan 10 sampai 60 detik. */
  generateTryOn: (input: { photo: EncodedImage; reference: EncodedImage; haircutName: string }) =>
    request<{ image: string }>('POST', '/api/try-on', input).then((result) => result.image),

  cancelReservation: (code: string, phone: string) =>
    request<{ reservation: Reservation }>('POST', `/api/reservations/${encodeURIComponent(code)}/cancel`, { phone }).then((result) => result.reservation),
}
