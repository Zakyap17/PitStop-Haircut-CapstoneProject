import type { Reservation } from '@/types/reservation'

/**
 * Penyimpanan sementara reservasi di sessionStorage, supaya halaman e-tiket bisa
 * menampilkan data dari form tanpa backend. Ganti dengan API saat backend siap.
 */
const STORAGE_KEY = 'pitstop:last-reservation'

export function saveReservation(reservation: Reservation): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reservation))
  } catch {
    // Storage bisa tidak tersedia (mode privat / diblokir); e-tiket akan menampilkan pesan kosong.
  }
}

export function loadReservation(): Reservation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Reservation) : null
  } catch {
    return null
  }
}

/** Kode reservasi dummy, contoh: "PS-4821". Backend nanti yang membuat kode asli. */
export function generateReservationCode(): string {
  return `PS-${Math.floor(1000 + Math.random() * 9000)}`
}
