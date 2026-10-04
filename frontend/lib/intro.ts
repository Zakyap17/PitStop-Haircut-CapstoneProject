import type Lenis from 'lenis'

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
  serverSnapshot: () => false,
}

export const lenisRef: { current: Lenis | null } = { current: null }
