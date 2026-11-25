import type { Reservation } from '@/types/reservation'

/**
 * Reservasi yang sedang dibuka di halaman e-tiket disimpan sementara di sessionStorage supaya halaman bisa
 * dimuat ulang. Sumber kebenarannya ada di backend: e-tiket menyegarkan datanya dari server saat dibuka.
 */
const CURRENT_KEY = 'pitstop:last-reservation'

/** Menjadikan reservasi ini yang tampil di halaman e-tiket. */
export function setCurrentReservation(reservation: Reservation): void {
  try {
    sessionStorage.setItem(CURRENT_KEY, JSON.stringify(reservation))
  } catch {
    // Storage bisa tidak tersedia (mode privat / diblokir); e-tiket akan menampilkan pesan kosong.
  }
}

export function loadReservation(): Reservation | null {
  try {
    const raw = sessionStorage.getItem(CURRENT_KEY)
    return raw ? (JSON.parse(raw) as Reservation) : null
  } catch {
    return null
  }
}
