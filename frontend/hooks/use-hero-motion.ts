'use client'

import { useCallback, useEffect, useRef } from 'react'
import { backOut, lerp, power2In, sleep, tween } from '@/lib/tween'

type Layer = 'fg' | 'bg'

type ItemState = {
  el: HTMLElement | null
  layer: Layer
  /** Urutan elemen, dipakai untuk membedakan kecepatan melayang. */
  index: number
  /** Dorongan dari kursor (dihaluskan). */
  rx: number
  ry: number
  angle: number
  /** Posisi dasar relatif terhadap posisi CSS-nya. */
  baseX: number
  baseY: number
}

const FLOAT_DURATIONS = [5, 7, 6, 8, 5.5, 6.5, 9, 11, 10]
const REPEL_RADIUS = 400
const REPEL_STRENGTH = -80

/**
 * Gerak hero: logo miring mengikuti kursor, tiga lapis parallax, elemen melayang yang menghindari kursor,
 * dan transisi saat ganti pilihan (logo berputar, elemen menyusut ke tengah lalu meledak ke posisi baru).
 * Semua dikerjakan lewat DOM langsung di requestAnimationFrame agar React tidak render ulang tiap frame.
 */
export function useHeroMotion() {
  const logoRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const diamondsRef = useRef<HTMLDivElement>(null)

  const itemsRef = useRef(new Map<string, ItemState>())
  const switching = useRef(false)
  const spin = useRef({ angle: 0, blur: 0 })
  const mouse = useRef({ x: 0, y: 0, px: -9999, py: -9999 })
  const smooth = useRef({ x: 0, y: 0 })
  const reducedMotion = useRef(false)

  /** Dipanggil sebagai ref callback oleh tiap elemen melayang. State-nya dipertahankan antar render. */
  const registerItem = useCallback((id: string, layer: Layer, index: number, el: HTMLElement | null) => {
    const items = itemsRef.current
    const existing = items.get(id)
    if (existing) {
      existing.el = el
      return
    }
    items.set(id, { el, layer, index, rx: 0, ry: 0, angle: (Math.random() - 0.5) * 16, baseX: 0, baseY: 0 })
  }, [])

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion.current) return

    const onPointerMove = (event: PointerEvent) => {
      mouse.current.x = event.clientX / window.innerWidth - 0.5
      mouse.current.y = event.clientY / window.innerHeight - 0.5
      mouse.current.px = event.clientX
      mouse.current.py = event.clientY
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
      if (fgRef.current) fgRef.current.style.transform = `translate(${x * 60}px, ${y * 60}px)`
      if (bgRef.current) bgRef.current.style.transform = `translate(${x * -30}px, ${y * -30}px)`
      if (diamondsRef.current) diamondsRef.current.style.transform = `translate(${x * -15}px, ${y * -15}px)`

      if (!switching.current) {
        itemsRef.current.forEach((item) => {
          const el = item.el
          if (!el) return
          const rect = el.getBoundingClientRect()
          const diffX = mouse.current.px - (rect.left + rect.width / 2)
          const diffY = mouse.current.py - (rect.top + rect.height / 2)
          const distance = Math.hypot(diffX, diffY)

          let targetRx = 0
          let targetRy = 0
          if (distance < REPEL_RADIUS && distance > 0) {
            const force = (REPEL_RADIUS - distance) / REPEL_RADIUS
            targetRx = (diffX / distance) * force * REPEL_STRENGTH
            targetRy = (diffY / distance) * force * REPEL_STRENGTH
          }

          item.rx += (targetRx - item.rx) * 0.1
          item.ry += (targetRy - item.ry) * 0.1

          const duration = FLOAT_DURATIONS[item.index % FLOAT_DURATIONS.length]
          const phase = (time + item.index * 0.7) * ((Math.PI * 2) / duration)
          const floatY = Math.sin(phase) * 15
          const floatAngle = Math.cos(phase) * 6
          el.style.transform = `translate(${item.rx + item.baseX}px, ${item.ry + item.baseY + floatY}px) rotate(${item.angle + floatAngle + item.rx * 0.12}deg)`
        })
      }

      diamondsRef.current?.querySelectorAll<HTMLElement>('[data-diamond]').forEach((diamond, i) => {
        const duration = 10 + i * 2
        const phase = (time + i * 1.2) * ((Math.PI * 2) / duration)
        diamond.style.transform = `translate(${Math.cos(phase * 0.5) * 15}px, ${Math.sin(phase) * 20}px) rotate(${Math.sin(phase * 0.3) * 15}deg)`
      })

      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  const isSwitching = useCallback(() => switching.current, [])

  /**
   * Transisi ganti pilihan: logo berputar 720° dengan blur gerak, semua elemen menyusut ke tengah,
   * `swapContent` dipanggil saat semuanya tersembunyi (untuk mengganti isi), lalu meledak ke posisi acak baru.
   */
  const runSwitch = useCallback(async (swapContent: () => void) => {
    if (switching.current) return
    switching.current = true

    if (reducedMotion.current) {
      swapContent()
      switching.current = false
      return
    }

    const spinTask = (async () => {
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
    })()

    const items = [...itemsRef.current.values()].filter((item) => item.el)
    const start = items.map((item) => ({ x: item.baseX + item.rx, y: item.baseY + item.ry, angle: item.angle }))
    const center = items.map((item) => {
      const el = item.el as HTMLElement
      const parent = el.parentElement as HTMLElement
      return {
        x: parent.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2),
        y: parent.clientHeight / 2 - (el.offsetTop + el.offsetHeight / 2),
      }
    })
    const apply = (item: ItemState, x: number, y: number, angle: number, scale: number, opacity: number) => {
      const el = item.el as HTMLElement
      el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`
      el.style.opacity = String(Math.min(1, Math.max(0, opacity)))
    }

    // 1) menyusut ke tengah
    await tween(0.5, power2In, (p) => {
      items.forEach((item, i) => apply(item, lerp(start[i].x, center[i].x, p), lerp(start[i].y, center[i].y, p), start[i].angle + 45 * p, 1 - 0.9 * p, 1 - p))
    })

    // 2) ganti isi saat tersembunyi, tahan sebentar
    swapContent()
    await sleep(300)

    // 3) meledak ke posisi acak baru
    const next = items.map(() => ({ x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 }))
    await tween(0.9, backOut(1.5), (p) => {
      items.forEach((item, i) => apply(item, lerp(center[i].x, next[i].x, p), lerp(center[i].y, next[i].y, p), start[i].angle + 45 * (1 - p), 0.1 + 0.9 * p, p))
    })

    items.forEach((item, i) => {
      item.baseX = next[i].x
      item.baseY = next[i].y
      item.rx = 0
      item.ry = 0
      item.angle = start[i].angle
      ;(item.el as HTMLElement).style.opacity = ''
    })

    await spinTask
    switching.current = false
  }, [])

  return { logoRef, fgRef, bgRef, diamondsRef, registerItem, runSwitch, isSwitching }
}
