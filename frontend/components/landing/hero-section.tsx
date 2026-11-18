'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useSyncExternalStore, type CSSProperties } from 'react'
import { Star } from 'lucide-react'
import { StyleCards } from '@/components/hero/style-cards'
import { Reveal } from '@/components/shared/reveal'
import { heroDiamonds, heroThemes, type HeroThemeId } from '@/data/hero-theme'
import { useHeroMotion } from '@/hooks/use-hero-motion'
import { intro } from '@/lib/intro-store'
import { cn } from '@/lib/utils'

const titleClass = 'font-script text-[clamp(4.5rem,10vw,12rem)] leading-[0.8] whitespace-nowrap'

/**
 * Hero ala referensi "Soda": gradien radial yang berganti warna, navbar kaca, judul cursive raksasa,
 * logo yang miring mengikuti kursor, kotak finish melayang di latar, dan kartu pilihan di kanan.
 * Memilih kartu mengubah warna latar dan memutar logo.
 */
export function HeroSection() {
  const introDone = useSyncExternalStore(intro.subscribe, intro.isFinished, intro.serverSnapshot)
  const [activeTheme, setActiveTheme] = useState<HeroThemeId>('dewasa')
  const motion = useHeroMotion()

  const handleSelect = (id: HeroThemeId) => {
    if (id === activeTheme || motion.isSwitching()) return
    setActiveTheme(id)
    void motion.runSwitch()
  }

  const colors = heroThemes[activeTheme].colors
  return (
    <section
      id="beranda"
      className="hero-theme relative isolate min-h-svh overflow-hidden"
      style={{ '--hero-inner': colors.inner, '--hero-mid': colors.mid, '--hero-outer': colors.outer } as CSSProperties}
    >
      <h1 className="sr-only">Pit Stop Barbershop: Fade, Crop, Shave, Kids</h1>

      {/* Kotak finish melayang di latar paling jauh */}
      <div ref={motion.diamondsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        {heroDiamonds.map((diamond) => (
          <div key={diamond.id} data-diamond className="absolute" style={{ top: diamond.top, left: diamond.left, width: diamond.size, height: diamond.size, opacity: diamond.opacity }}>
            <div
              className="size-full rotate-45 rounded-xl"
              style={{ backgroundImage: 'conic-gradient(#f3f1ea 25%, transparent 0 50%, #f3f1ea 0 75%, transparent 0)', backgroundSize: '50% 50%' }}
            />
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1920px] flex-col gap-10 px-[4%] pt-28 pb-12 lg:flex-row lg:justify-between lg:pt-24">
        {/* Kolom kiri */}
        <div className="relative z-20 flex flex-col items-start gap-8 lg:py-12">
          <Reveal as="p" afterIntro aria-hidden="true" className={titleClass}>
            Fade
            <br />
            Crop
          </Reveal>
          <Reveal as="p" afterIntro delay={200} className="max-w-[400px] text-[1.1rem] leading-relaxed text-white/70">
            Barbershop untuk pria dan anak dengan presisi ala kru pit stop. Pilih kapster, kunci slot online, datang tanpa antre — si kecil duduk di kursi mobil
            balap.
          </Reveal>
          <Reveal afterIntro delay={350}>
            <Link
              href="#reservasi"
              className="flex w-fit items-center gap-6 rounded-full bg-black/50 py-1.5 pr-1.5 pl-6 font-bold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-black/70"
            >
              Booking Slot
              <span className="flex size-[38px] items-center justify-center rounded-full bg-primary pb-0.5 text-[1.4rem] leading-none font-black text-white">+</span>
            </Link>
          </Reveal>
          <Reveal afterIntro delay={500} className="mt-auto flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Star className="size-5 fill-accent text-accent" aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="text-[0.7rem] tracking-[0.1em] text-white/70">RATING PELANGGAN</span>
              <span className="text-[0.85rem] font-semibold">4.9 / 5 · 1.200+ POTONGAN</span>
            </span>
          </Reveal>
        </div>

        {/* Logo di tengah: miring mengikuti kursor, berputar saat ganti pilihan */}
        <div className={cn('pointer-events-none order-first flex items-center justify-center lg:absolute lg:inset-0 lg:order-none', introDone ? 'hero-stage-in' : 'opacity-0')}>
          <div className="hero-center-float">
            <div className="relative flex items-center justify-center [perspective:1200px]">
              <div
                aria-hidden="true"
                className="absolute size-[130%] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--primary)_55%,transparent)_0%,transparent_65%)] blur-2xl"
              />
              <div ref={motion.logoRef} className="will-change-transform [transform-style:preserve-3d]">
                <Image
                  src="/images/brand/logo-mark.png"
                  alt="Logo Pit Stop Barbershop Men & Kids"
                  width={460}
                  height={460}
                  preload
                  className="size-56 rounded-full shadow-[0_40px_120px_-20px_color-mix(in_srgb,var(--primary)_80%,transparent)] sm:size-72 lg:size-[22rem]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kolom kanan */}
        <div className="pointer-events-none relative z-20 flex w-full flex-col items-center justify-between gap-10 lg:w-[450px] lg:items-end lg:py-12 lg:text-right">
          <Reveal afterIntro delay={300}>
            <StyleCards active={activeTheme} onSelect={handleSelect} />
          </Reveal>
          <Reveal as="p" afterIntro delay={450} aria-hidden="true" className={cn(titleClass, 'self-center text-center lg:self-end lg:text-right')}>
            Shave
            <br />
            Kids
          </Reveal>
        </div>
      </div>
    </section>
  )
}
