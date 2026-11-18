'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type LiquidImageProps = {
  src: string
  alt: string
  /** Ukuran, bentuk, dan sudut dari pembungkus (mis. "aspect-[4/5] rounded-2xl"). */
  className?: string
  sizes?: string
  preload?: boolean
  /** Kekuatan distorsi saat hover. */
  maxScale?: number
}

const BASE_FREQUENCY = 0.009
const HOVER_FREQUENCY = 0.022

/**
 * Foto dengan efek distorsi "cairan" saat di-hover (SVG turbulence + displacement dengan animasi pegas).
 * Foto selalu tampil tajam dan berwarna asli: filter hanya dipasang selama hover/animasi berlangsung,
 * tanpa lapisan warna di atasnya. Tidak aktif di layar sentuh, layar kecil, atau saat reduced motion.
 */
export function LiquidImage({ src, alt, className, sizes = '50vw', preload, maxScale = 28 }: LiquidImageProps) {
  const filterId = `liquid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null)
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)
  const targetRef = useRef(0)
  const progressRef = useRef(0)
  const frameRef = useRef(0)
  const [filterActive, setFilterActive] = useState(false)

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const animateTo = (target: number) => {
    targetRef.current = target
    cancelAnimationFrame(frameRef.current)
    let position = progressRef.current
    let velocity = 0
    let last = performance.now()

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const force = 140 * (targetRef.current - position) - 13 * velocity
      velocity += force * dt
      position += velocity * dt
      progressRef.current = position

      const strength = Math.max(0, position)
      displacementRef.current?.setAttribute('scale', String(1 + strength * (maxScale - 1)))
      turbulenceRef.current?.setAttribute('baseFrequency', String(BASE_FREQUENCY + strength * (HOVER_FREQUENCY - BASE_FREQUENCY)))

      const stillMoving = Math.abs(velocity) > 0.001 || Math.abs(targetRef.current - position) > 0.001
      if (stillMoving) {
        frameRef.current = requestAnimationFrame(step)
      } else if (targetRef.current === 0) {
        setFilterActive(false)
      }
    }
    frameRef.current = requestAnimationFrame(step)
  }

  const canHover = () => window.matchMedia('(hover: hover) and (min-width: 769px) and (prefers-reduced-motion: no-preference)').matches

  return (
    <figure
      className={cn('relative overflow-hidden bg-card', className)}
      onPointerEnter={() => {
        if (!canHover()) return
        setFilterActive(true)
        animateTo(1)
      }}
      onPointerLeave={() => animateTo(0)}
    >
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={filterId}>
          <feTurbulence ref={turbulenceRef} type="fractalNoise" baseFrequency={BASE_FREQUENCY} numOctaves={2} result="noise" />
          <feDisplacementMap ref={displacementRef} in="SourceGraphic" in2="noise" scale={1} />
        </filter>
      </svg>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        className="object-cover"
        style={filterActive ? { filter: `url(#${filterId})` } : undefined}
      />
    </figure>
  )
}
