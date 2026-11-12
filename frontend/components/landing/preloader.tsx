'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { intro } from '@/lib/intro-store'
import { cn } from '@/lib/utils'

type Phase = 'count' | 'fade' | 'wipe' | 'done'

const COUNT_DURATION_MS = 2000

/** Layar pembuka: hitung 0–100%, lalu layar terangkat ke atas dan animasi halaman dimulai. */
export function Preloader() {
  const [count, setCount] = useState(0)
  // Saat kembali ke beranda lewat navigasi (intro sudah pernah selesai), preloader tidak diputar ulang.
  const [phase, setPhase] = useState<Phase>(() => (intro.isFinished() ? 'done' : 'count'))

  useEffect(() => {
    if (phase !== 'count') return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done')
      intro.finish()
      return
    }

    window.scrollTo(0, 0)
    let frame = 0
    const timers: number[] = []
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_DURATION_MS, 1)
      const eased = 1 - Math.pow(1 - progress, 1.6)
      setCount(Math.round(eased * 100))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
        return
      }
      setPhase('fade')
      timers.push(
        window.setTimeout(() => {
          setPhase('wipe')
          intro.finish()
        }, 500),
      )
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      timers.forEach(clearTimeout)
    }
    // Efek hanya dijalankan sekali saat mount; `phase` hanya dibaca di awal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'done') return null

  const labelsHidden = phase === 'fade' || phase === 'wipe'

  return (
    <div
      aria-hidden="true"
      data-preloader=""
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && phase === 'wipe') setPhase('done')
      }}
      className={cn(
        'fixed inset-0 z-[100] flex flex-col justify-end transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
        phase === 'wipe' ? '-translate-y-full' : 'translate-y-0',
      )}
    >
      <div className="absolute inset-0 -z-10 bg-background" />
      <div
        className={cn(
          'flex flex-col items-start gap-3 px-6 pb-8 transition-opacity duration-300 sm:flex-row sm:items-end sm:justify-between sm:gap-4 md:px-12',
          labelsHidden && 'opacity-0',
        )}
      >
        <div className="flex items-center gap-4">
          <Image src="/images/brand/logo-mark.png" alt="" width={56} height={56} className="size-14 rounded-full" preload />
          <div>
            <p className="font-display text-3xl leading-none tracking-tight uppercase">Pit Stop</p>
            <p className="mt-1 text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">Barbershop — Men &amp; Kids</p>
          </div>
        </div>
        <p className="font-display text-8xl leading-none tabular-nums sm:text-9xl">
          {count}
          <span className="text-accent">%</span>
        </p>
      </div>
      <div className="h-1 bg-foreground/10">
        <div className="h-full bg-accent" style={{ width: `${count}%` }} />
      </div>
      <div className="checker-strip h-5 [background-size:20px_20px]" />
    </div>
  )
}
