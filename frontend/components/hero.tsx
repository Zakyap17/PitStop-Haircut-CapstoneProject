'use client'

import { useSyncExternalStore } from 'react'
import { Plus, Star } from 'lucide-react'
import { HeroLogo } from '@/components/hero-logo'
import { Letters, Lines, Reveal } from '@/components/reveal'
import { intro } from '@/lib/intro'

export function Hero() {
  const introDone = useSyncExternalStore(intro.subscribe, intro.isFinished, intro.serverSnapshot)

  return (
    <section
      id="beranda"
      className="relative flex min-h-svh flex-col overflow-hidden bg-[radial-gradient(70%_60%_at_50%_100%,color-mix(in_srgb,var(--primary)_35%,transparent)_0%,transparent_70%)]"
    >
      <div className="relative z-30 flex flex-col gap-8 px-4 pt-28 sm:flex-row sm:items-start sm:justify-between sm:pt-32 md:px-10">
        <Reveal
          as="h2"
          afterIntro
          className="font-display text-4xl uppercase leading-[1.05] tracking-tight sm:text-5xl"
        >
          <Lines lines={['Fade', 'Crop', 'Shave', 'Kids']} baseDelay={200} stagger={80} duration={760} />
        </Reveal>

        <Reveal afterIntro delay={400} className="fade-up flex max-w-sm flex-col gap-6 sm:items-end sm:text-right">
          <p className="leading-relaxed text-muted-foreground">
            Barbershop untuk pria dan anak dengan presisi ala kru pit stop. Pilih kapster, kunci slot online, datang
            tanpa antre — si kecil duduk di kursi mobil balap.
          </p>
          <a
            href="#reservasi"
            className="flex w-fit items-center gap-5 rounded-full border border-[var(--line-strong)] bg-background/60 py-1.5 pl-6 pr-1.5 font-semibold backdrop-blur transition-transform hover:-translate-y-0.5"
          >
            Booking Slot
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Plus className="size-5" aria-hidden="true" />
            </span>
          </a>
          <p className="flex items-center gap-2 text-sm">
            <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
            <span className="font-semibold">4.9 / 5</span>
            <span className="text-muted-foreground">· 1.200+ potongan</span>
          </p>
        </Reveal>
      </div>

      <div className="pointer-events-none absolute bottom-[17vw] left-1/2 z-20 -translate-x-1/2 sm:bottom-[9vw] lg:bottom-[7vw]">
        <div className="pointer-events-auto">
          <HeroLogo spin={introDone} className="size-44 sm:size-64 lg:size-80" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[22vh] bg-gradient-to-b from-transparent to-background" />

      <Reveal
        as="h1"
        afterIntro
        className="absolute inset-x-0 bottom-0 z-10 flex translate-y-[8%] flex-col items-center font-display uppercase leading-[0.78] tracking-tight text-primary text-[40vw] sm:flex-row sm:justify-center sm:gap-[0.42em] sm:text-[21vw]"
      >
        <span className="sr-only">Pit Stop</span>
        <Letters text="Pit" />
        <Letters text="Stop" baseDelay={240} />
      </Reveal>

      <Reveal
        afterIntro
        delay={900}
        className="fade-up absolute bottom-6 left-4 z-30 flex items-center gap-3 text-[13px] uppercase tracking-[0.22em] text-muted-foreground md:left-10"
      >
        <span className="h-px w-10 bg-accent" aria-hidden="true" />
        Scroll masuk pit
      </Reveal>
      <Reveal
        afterIntro
        delay={900}
        className="fade-up absolute bottom-6 right-4 z-30 hidden text-[13px] uppercase tracking-[0.22em] text-muted-foreground sm:block md:right-10"
      >
        Men & Kids · 10.00 – 21.00
      </Reveal>
    </section>
  )
}
