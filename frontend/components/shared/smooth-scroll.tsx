'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'
import { intro, lenisRef } from '@/lib/intro-store'

/** Scroll halus (Lenis). Dikunci selama preloader berjalan, dan dimatikan jika pengguna memilih reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Jarak ke navbar sticky saat lompat ke anchor diatur lewat `scroll-mt-20` di SectionContainer (Lenis ikut menghormatinya).
    const lenis = new Lenis({ smoothWheel: true, anchors: true })
    lenisRef.current = lenis
    if (!intro.isFinished()) lenis.stop()
    const unsubscribe = intro.subscribe(() => lenis.start())

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return null
}
