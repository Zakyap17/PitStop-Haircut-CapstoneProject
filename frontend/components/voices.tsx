'use client'

import { useState } from 'react'
import { Eyebrow } from '@/components/eyebrow'
import { LiquidImage } from '@/components/liquid-image'
import { Lines, Reveal, Words } from '@/components/reveal'
import { cn } from '@/lib/utils'

const voices = [
  {
    quote:
      'Anak saya biasanya nangis kalau potong rambut. Di sini malah minta balik minggu depan gara-gara kursi mobil balapnya.',
    name: 'Dewi Lestari',
    role: 'Orang tua pelanggan',
    image: '/images/cuts/kids-cut.png',
  },
  {
    quote: 'Skin fade-nya rapi sampai detail garis. Booking jam tujuh malam, datang langsung duduk, nggak pakai nunggu.',
    name: 'Arif Pratama',
    role: 'Pelanggan rutin',
    image: '/images/cuts/skin-fade.png',
  },
  {
    quote: 'Fitur try-on bikin saya berani coba two block. Hasilnya persis seperti yang saya lihat di layar sebelum potong.',
    name: 'Kevin Wijaya',
    role: 'Mahasiswa',
    image: '/images/cuts/curtain.png',
  },
]

export function Voices() {
  const [active, setActive] = useState(0)
  const current = voices[active]

  return (
    <section id="testimoni" className="px-4 py-24 md:px-10 md:py-36">
      <Eyebrow>Testimoni</Eyebrow>
      <Reveal as="h2" className="mt-6 font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">
        <Lines lines={['Kata mereka.']} />
      </Reveal>

      <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-10">
        <ul className="lg:col-span-5">
          {voices.map((voice, index) => {
            const isActive = index === active
            return (
              <li key={voice.name}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActive(index)}
                  onPointerEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  className={cn(
                    'flex w-full items-baseline gap-5 border-t border-border py-7 text-left',
                    index === voices.length - 1 && 'border-b',
                  )}
                >
                  <span
                    className={cn(
                      'text-[13px] tabular-nums tracking-[0.18em] transition-colors',
                      isActive ? 'text-accent' : 'text-muted-foreground',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1">
                    <span
                      className={cn(
                        'block text-2xl font-semibold tracking-tight transition-colors',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {voice.name}
                    </span>
                    <span className="mt-1 block text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
                      {voice.role}
                    </span>
                  </span>
                  <span
                    className={cn('h-px self-center bg-accent transition-all duration-300', isActive ? 'w-10' : 'w-0')}
                    aria-hidden="true"
                  />
                </button>
              </li>
            )
          })}
        </ul>

        <div className="grid items-start gap-8 sm:grid-cols-[1fr_auto] lg:col-span-7">
          <blockquote className="order-2 sm:order-1" aria-live="polite">
            <Reveal key={current.name} as="p" className="max-w-[30ch] text-2xl font-medium leading-snug tracking-tight md:text-3xl">
              <Words text={`“${current.quote}”`} />
            </Reveal>
            <footer className="mt-8 text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
              {current.name} — {current.role}
            </footer>
          </blockquote>
          <Reveal
            className="fade-up order-1 sm:order-2 sm:w-64"
            style={{ '--dur': '640ms', '--y': '0px' } as React.CSSProperties}
          >
            <LiquidImage
              src={current.image}
              alt={`Hasil potongan untuk ${current.name}`}
              maxScale={22}
              className="aspect-[4/5] w-full rounded-sm"
              sizes="(min-width: 640px) 16rem, 100vw"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
