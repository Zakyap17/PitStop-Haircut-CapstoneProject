'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { cutCategories, cuts as allCuts } from '@/lib/data'
import { cn } from '@/lib/utils'

const pad = (n: number) => String(n).padStart(2, '0')

export function PortfolioCarousel() {
  const [category, setCategory] = useState('Semua')
  const [active, setActive] = useState(Math.floor(allCuts.length / 2))
  const dragStart = useRef<number | null>(null)

  const cuts = category === 'Semua' ? allCuts : allCuts.filter((cut) => cut.category === category)
  const go = (index: number) => setActive(Math.max(0, Math.min(cuts.length - 1, index)))
  const current = cuts[Math.min(active, cuts.length - 1)]

  const selectCategory = (next: string) => {
    const count = next === 'Semua' ? allCuts.length : allCuts.filter((cut) => cut.category === next).length
    setCategory(next)
    setActive(Math.floor(count / 2))
  }

  return (
    <section id="portofolio" className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 text-center md:px-8">
        <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          <span className="h-px w-10 bg-muted-foreground/50" aria-hidden="true" />
          Portofolio Kapster · Vol. 01
          <span className="h-px w-10 bg-muted-foreground/50" aria-hidden="true" />
        </p>
        <h2 className="mt-5 font-serif text-5xl leading-none text-balance md:text-7xl">
          Hasil cukur,
          <br />
          dibingkai <em className="text-accent">rapi</em>
        </h2>

        <div role="group" aria-label="Filter kategori gaya" className="mt-8 flex flex-wrap justify-center gap-2">
          {cutCategories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => selectCategory(item)}
              aria-pressed={category === item}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] transition-colors',
                category === item
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Portofolio gaya rambut"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(active - 1)
          if (e.key === 'ArrowRight') go(active + 1)
        }}
        onPointerDown={(e) => {
          dragStart.current = e.clientX
        }}
        onPointerUp={(e) => {
          if (dragStart.current === null) return
          const dx = e.clientX - dragStart.current
          if (dx > 50) go(active - 1)
          if (dx < -50) go(active + 1)
          dragStart.current = null
        }}
        className="relative mt-12 flex h-[420px] touch-pan-y select-none items-center justify-center rounded-3xl [perspective:1400px] md:h-[480px]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute font-serif text-[18rem] leading-none text-foreground/[0.04] md:text-[26rem]"
        >
          {pad(active + 1)}
        </span>
        <div
          aria-hidden="true"
          className="absolute bottom-6 h-16 w-2/3 rounded-full bg-primary/30 blur-3xl"
        />

        {cuts.map((cut, index) => {
          const offset = index - active
          const abs = Math.abs(offset)
          return (
            <button
              key={cut.name}
              type="button"
              onClick={() => go(index)}
              aria-label={`${cut.name} oleh ${cut.barber}`}
              aria-current={offset === 0}
              tabIndex={abs > 3 ? -1 : 0}
              className={cn(
                'absolute aspect-[3/4] w-[150px] overflow-hidden rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-foreground/15 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:w-[190px]',
                offset === 0 && 'ring-2 ring-accent',
              )}
              style={{
                transform: `translateX(calc(${offset} * clamp(120px, 16vw, 225px))) rotateY(${-offset * 16}deg) scale(${1 + abs * 0.1})`,
                zIndex: 10 - abs,
                opacity: abs > 3 ? 0 : 1,
              }}
            >
              <Image src={cut.image || '/placeholder.svg'} alt="" fill sizes="220px" className="pointer-events-none object-cover" draggable={false} />
              <span className="absolute left-3 top-3 text-[10px] font-semibold text-foreground/90">{pad(index + 1)}</span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 pt-10 text-left font-serif text-lg">
                {cut.name}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mx-auto mt-6 flex max-w-7xl flex-col items-center gap-3 px-4 md:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">Drag · Swipe · Arrow Keys</p>
        <div className="relative flex w-full items-end justify-center">
          <p className="absolute bottom-0 left-0 hidden font-serif text-5xl md:block">
            {pad(active + 1)}
            <span className="font-sans text-sm text-muted-foreground"> / {pad(cuts.length)}</span>
          </p>

          <div className="flex flex-col items-center gap-2" aria-live="polite">
            <p className="font-serif text-4xl">{current.name}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Kapster {current.barber} · {current.category}
              <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
              <span className="font-semibold text-foreground">{current.rating.toFixed(1)}</span>
            </p>
            <div className="mt-2 flex gap-1.5">
              {cuts.map((cut, index) => (
                <button
                  key={cut.name}
                  type="button"
                  onClick={() => go(index)}
                  aria-label={`Tampilkan ${cut.name}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === active ? 'w-6 bg-primary' : 'w-1.5 bg-foreground/25 hover:bg-foreground/50',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 right-0 hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              aria-label="Sebelumnya"
              className="flex size-12 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 transition-colors hover:bg-foreground/10 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              disabled={active === cuts.length - 1}
              aria-label="Berikutnya"
              className="flex size-12 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 transition-colors hover:bg-foreground/10 disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
