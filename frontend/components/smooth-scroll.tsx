'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'
import { intro, lenisRef } from '@/lib/intro'

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({ smoothWheel: true, anchors: { offset: -72 } })
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
