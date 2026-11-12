import type Lenis from 'lenis'

/**
 * Status intro (preloader) yang dipakai bersama oleh Preloader, SmoothScroll, dan animasi Reveal.
 * Animasi dengan `afterIntro` menunggu sampai `intro.finish()` dipanggil.
 */
let finished = false
const listeners = new Set<() => void>()

export const intro = {
  finish() {
    if (finished) return
    finished = true
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  isFinished: () => finished,
  /** Snapshot untuk render di server: intro dianggap belum selesai. */
  serverSnapshot: () => false,
}

/** Instance Lenis aktif, supaya komponen lain (mis. menu mobile) bisa menghentikan/menjalankan scroll. */
export const lenisRef: { current: Lenis | null } = { current: null }
