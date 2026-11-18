'use client'

import { useCallback, useEffect, useRef } from 'react'
import { backOut, power2In, tween } from '@/lib/tween'

/**
 * Gerak hero: logo miring mengikuti kursor, kotak finish di latar bergeser (parallax) dan melayang,
 * serta logo berputar 720° dengan blur gerak saat ganti pilihan.
 * Dikerjakan lewat DOM langsung di requestAnimationFrame agar React tidak render ulang tiap frame.
 */
export function useHeroMotion() {
  const logoRef = useRef<HTMLDivElement>(null)
  const diamondsRef = useRef<HTMLDivElement>(null)

  const switching = useRef(false)
  const spin = useRef({ angle: 0, blur: 0 })
  const mouse = useRef({ x: 0, y: 0 })
  const smooth = useRef({ x: 0, y: 0 })
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion.current) return

    const onPointerMove = (event: PointerEvent) => {
      mouse.current.x = event.clientX / window.innerWidth - 0.5
      mouse.current.y = event.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointerMove)

    let frame = 0
    const loop = () => {
      const time = performance.now() / 1000
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.05
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.05
      const { x, y } = smooth.current

      if (logoRef.current) {
        logoRef.current.style.transform = `rotateY(${x * 30 + spin.current.angle}deg) rotateX(${-y * 20}deg)`
        logoRef.current.style.filter = spin.current.blur > 0.05 ? `blur(${spin.current.blur}px)` : ''
      }
      if (diamondsRef.current) {
        diamondsRef.current.style.transform = `translate(${x * -15}px, ${y * -15}px)`
        diamondsRef.current.querySelectorAll<HTMLElement>('[data-diamond]').forEach((diamond, i) => {
          const duration = 10 + i * 2
          const phase = (time + i * 1.2) * ((Math.PI * 2) / duration)
          diamond.style.transform = `translate(${Math.cos(phase * 0.5) * 15}px, ${Math.sin(phase) * 20}px) rotate(${Math.sin(phase * 0.3) * 15}deg)`
        })
      }

      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  const isSwitching = useCallback(() => switching.current, [])

  /** Transisi ganti pilihan: logo berputar 360° dengan blur, lalu 360° lagi sambil memudar blurnya. */
  const runSwitch = useCallback(async () => {
    if (switching.current) return
    switching.current = true

    if (!reducedMotion.current) {
      await tween(0.6, power2In, (p) => {
        spin.current.angle = 360 * p
        spin.current.blur = 15 * p
      })
      await tween(1.5, backOut(0.7), (p) => {
        spin.current.angle = 360 + 360 * p
        spin.current.blur = Math.max(0, 15 * (1 - p))
      })
      spin.current.angle = 0
      spin.current.blur = 0
    }

    switching.current = false
  }, [])

  return { logoRef, diamondsRef, runSwitch, isSwitching }
}
