import type { Reservation } from '@/types/reservation'

/**
 * Penyimpanan reservasi di browser, sementara sampai backend siap:
 * - sessionStorage: reservasi yang sedang dibuka di halaman e-tiket.
 * - localStorage: riwayat reservasi di perangkat ini, dipakai halaman Cek Reservasi.
 * Ganti isi fungsi-fungsi di sini dengan pemanggilan API saat backend tersedia.
 */
const CURRENT_KEY = 'pitstop:last-reservation'
const HISTORY_KEY = 'pitstop:reservations'
const MAX_HISTORY = 20

function readHistory(): Reservation[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? (JSON.parse(raw) as Reservation[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** Menjadikan reservasi ini yang tampil di halaman e-tiket. */
export function setCurrentReservation(reservation: Reservation): void {
  try {
    sessionStorage.setItem(CURRENT_KEY, JSON.stringify(reservation))
  } catch {
    // Storage bisa tidak tersedia (mode privat / diblokir); e-tiket akan menampilkan pesan kosong.
  }
}

/** Menyimpan reservasi baru: jadi e-tiket aktif dan masuk riwayat perangkat ini. */
export function saveReservation(reservation: Reservation): void {
  setCurrentReservation(reservation)
  try {
    const history = [reservation, ...readHistory().filter((item) => item.code !== reservation.code)].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // riwayat tidak tersimpan; e-tiket tetap bisa dibuka sekarang
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

/** Merapikan kode yang diketik pengguna: "ps4821", " PS 4821 " dan "4821" semuanya menjadi "PS-4821". */
export function normalizeReservationCode(input: string): string {
  const compact = input.trim().toUpperCase().replace(/\s+/g, '')
  const match = compact.match(/^(?:PS-?)?(\d{4})$/)
  return match ? `PS-${match[1]}` : compact
}

/** Mencari reservasi di perangkat ini berdasarkan kode dan email (huruf besar/kecil tidak dibedakan). */
export function findReservation(code: string, email: string): Reservation | null {
  const wantedCode = normalizeReservationCode(code)
  const wantedEmail = email.trim().toLowerCase()
  return readHistory().find((item) => item.code === wantedCode && item.customerEmail.trim().toLowerCase() === wantedEmail) ?? null
}

/** Kode reservasi dummy, contoh: "PS-4821". Backend nanti yang membuat kode asli. */
export function generateReservationCode(): string {
  return `PS-${Math.floor(1000 + Math.random() * 9000)}`
}
