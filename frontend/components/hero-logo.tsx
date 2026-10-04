'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function HeroLogo({ spin, className }: { spin: boolean; className?: string }) {
  const tiltRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const el = tiltRef.current
      if (!el) return
      const x = (event.clientX / window.innerWidth - 0.5) * 2
      const y = (event.clientY / window.innerHeight - 0.5) * 2
      el.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg)`
    }
    window.addEventListener('pointermove', handleMove)
    return () => window.removeEventListener('pointermove', handleMove)
  }, [])

  return (
    <div className="relative flex items-center justify-center [perspective:1200px]">
      <div
        aria-hidden="true"
        className="absolute size-[130%] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--primary)_55%,transparent)_0%,transparent_65%)] blur-2xl"
      />
      <div className="animate-float-y">
        <div ref={tiltRef} className="transition-transform duration-300 ease-out [transform-style:preserve-3d]">
          <div className={spin ? 'animate-spin-once' : 'opacity-0'}>
            <Image
              src="/images/logo.png"
              alt="Logo Pit Stop Barbershop Men & Kids"
              width={460}
              height={460}
              priority
              className={cn(
                'rounded-full shadow-[0_40px_120px_-20px_color-mix(in_srgb,var(--primary)_80%,transparent)]',
                className,
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
