import type { Availability } from '@/types/catalog'
import type { Reservation } from '@/types/reservation'

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
  barberId: string
  date: string
  time: string
  customerName: string
  customerEmail: string
  /** Nomor WhatsApp tujuan invoice. */
  customerPhone: string
  hairstyle?: string
}

export const api = {
  getAvailability: (date: string, serviceId: string) => request<Availability>('GET', `/api/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}`),

  createReservation: (input: NewReservation) => request<{ reservation: Reservation }>('POST', '/api/reservations', input).then((result) => result.reservation),

  lookupReservation: (code: string, email: string) => request<{ reservation: Reservation }>('POST', '/api/reservations/lookup', { code, email }).then((result) => result.reservation),

  rescheduleReservation: (code: string, input: { email: string; barberId: string; date: string; time: string }) =>
    request<{ reservation: Reservation }>('POST', `/api/reservations/${encodeURIComponent(code)}/reschedule`, input).then((result) => result.reservation),

  cancelReservation: (code: string, email: string) =>
    request<{ reservation: Reservation }>('POST', `/api/reservations/${encodeURIComponent(code)}/cancel`, { email }).then((result) => result.reservation),
}
