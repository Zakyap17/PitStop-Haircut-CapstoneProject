/** Fungsi easing (0..1 -> 0..1) untuk animasi hero. Bentuknya mengikuti GSAP: power2.in dan back.out. */
export const power2In = (t: number) => t * t

export const backOut =
  (overshoot: number) =>
  (t: number) => {
    const x = t - 1
    return x * x * ((overshoot + 1) * x + overshoot) + 1
  }

export const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Animasi berbasis requestAnimationFrame. `onUpdate` menerima progres setelah easing (bisa melewati 1 pada back.out). */
export function tween(durationSeconds: number, ease: (t: number) => number, onUpdate: (progress: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - start) / (durationSeconds * 1000), 1)
      onUpdate(ease(t))
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}
