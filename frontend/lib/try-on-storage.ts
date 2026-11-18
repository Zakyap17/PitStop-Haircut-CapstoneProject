import type { TryOnChoice } from '@/types/try-on'

/**
 * Pilihan gaya dari Virtual Try-On disimpan di localStorage browser supaya bisa dilampirkan saat reservasi.
 * Yang disimpan hanya nama gaya, bukan foto atau gambar kamera.
 */
export const TRY_ON_STORAGE_KEY = 'pitstop:try-on-choice'
/** Event kustom: storage event bawaan browser tidak terkirim ke tab yang sama. */
export const TRY_ON_CHANGED_EVENT = 'pitstop:try-on-choice-changed'

function notifyChanged() {
  window.dispatchEvent(new Event(TRY_ON_CHANGED_EVENT))
}

export function saveTryOnChoice(choice: TryOnChoice): void {
  try {
    localStorage.setItem(TRY_ON_STORAGE_KEY, JSON.stringify(choice))
  } catch {
    // Storage bisa tidak tersedia (mode privat / diblokir); pilihan tidak tersimpan.
  }
  notifyChanged()
}

export function clearTryOnChoice(): void {
  try {
    localStorage.removeItem(TRY_ON_STORAGE_KEY)
  } catch {
    // diabaikan
  }
  notifyChanged()
}

/** Isi mentah dari storage (string/null). Dipakai sebagai snapshot yang stabil untuk useSyncExternalStore. */
export function readRawTryOnChoice(): string | null {
  try {
    return localStorage.getItem(TRY_ON_STORAGE_KEY)
  } catch {
    return null
  }
}

export function parseTryOnChoice(raw: string | null): TryOnChoice | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<TryOnChoice>
    if (typeof value.name !== 'string' || typeof value.barber !== 'string' || typeof value.category !== 'string') return null
    return { name: value.name, barber: value.barber, category: value.category }
  } catch {
    return null
  }
}
