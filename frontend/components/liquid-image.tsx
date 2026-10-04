'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type LiquidImageProps = {
  src: string
  alt: string
  className?: string
  sizes?: string
  maxScale?: number
  bare?: boolean
  priority?: boolean
}

const BASE_FREQ = 0.009
const HOVER_FREQ = 0.022

export function LiquidImage({ src, alt, className, sizes = '50vw', maxScale = 28, bare = false, priority }: LiquidImageProps) {
  const filterId = `liquid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null)
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)
  const targetRef = useRef(0)
  const frameRef = useRef(0)
  const [hovered, setHovered] = useState(false)

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const animate = (target: number) => {
    targetRef.current = target
    cancelAnimationFrame(frameRef.current)
    let position = Number(displacementRef.current?.dataset.progress ?? 0)
    let velocity = 0
    let last = performance.now()

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const force = 140 * (targetRef.current - position) - 13 * velocity
      velocity += force * dt
      position += velocity * dt
      const displacement = displacementRef.current
      const turbulence = turbulenceRef.current
      if (displacement && turbulence) {
        const clamped = Math.max(0, position)
        displacement.dataset.progress = String(position)
        displacement.setAttribute('scale', String(1 + clamped * (maxScale - 1)))
        turbulence.setAttribute('baseFrequency', String(BASE_FREQ + clamped * (HOVER_FREQ - BASE_FREQ)))
      }
      if (Math.abs(velocity) > 0.001 || Math.abs(targetRef.current - position) > 0.001) {
        frameRef.current = requestAnimationFrame(step)
      }
    }
    frameRef.current = requestAnimationFrame(step)
  }

  const canHover = () => window.matchMedia('(hover: hover) and (min-width: 769px)').matches

  return (
    <figure
      className={cn('relative overflow-hidden', !bare && 'bg-card', className)}
      onPointerEnter={() => {
        if (!canHover()) return
        setHovered(true)
        animate(1)
      }}
      onPointerLeave={() => {
        setHovered(false)
        animate(0)
      }}
    >
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={filterId}>
          <feTurbulence ref={turbulenceRef} type="fractalNoise" baseFrequency={BASE_FREQ} numOctaves={2} result="noise" />
          <feDisplacementMap ref={displacementRef} in="SourceGraphic" in2="noise" scale={1} />
        </filter>
      </svg>
      <Image
        src={src || '/placeholder.svg'}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={{ filter: `url(#${filterId})` }}
      />
      {!bare && (
        <>
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 bg-background mix-blend-color transition-opacity duration-[380ms] ease-out',
              hovered ? 'opacity-0' : 'opacity-70',
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,color-mix(in_srgb,var(--accent)_35%,transparent)_50%,transparent_70%)] transition-opacity duration-[340ms] ease-out',
              hovered ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_120%,color-mix(in_srgb,var(--background)_70%,transparent),transparent_60%)]"
          />
        </>
      )}
    </figure>
  )
}
