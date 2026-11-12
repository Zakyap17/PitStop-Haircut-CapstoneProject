import Link from 'next/link'
import { LiquidImage } from '@/components/shared/liquid-image'
import { Reveal, RevealHeading } from '@/components/shared/reveal'
import { buttonVariants } from '@/components/ui/button'

/** Semua elemen hero memakai `afterIntro` agar animasinya mulai setelah preloader selesai. */
export function HeroSection() {
  return (
    <section id="beranda" className="flex flex-col items-center gap-8 px-6 pt-16 pb-[72px] md:px-12 lg:px-24 lg:pt-24">
      <Reveal as="p" afterIntro className="text-center text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">
        Pit-crew precision · Men &amp; Kids
      </Reveal>

      <RevealHeading
        as="h1"
        afterIntro
        text="Fade Crop Shave Kids"
        delay={150}
        wordStagger={110}
        className="max-w-[1100px] text-center font-display text-[64px] leading-[0.95] tracking-[-0.025em] text-foreground uppercase sm:text-[104px] lg:text-[150px]"
      />

      <Reveal as="p" afterIntro delay={500} className="max-w-[620px] text-center text-base leading-normal text-muted-foreground sm:text-lg">
        Barbershop pria dan anak dengan presisi ala pit crew. Reservasi online, kursi mobil balap untuk si kecil, tanpa antre.
      </Reveal>

      <Reveal afterIntro delay={650} className="flex flex-wrap items-center justify-center gap-4">
        <Link href="#reservasi" className={buttonVariants({ size: 'pill' })}>
          Booking Slot
        </Link>
        <p className="flex items-center gap-2.5">
          <span className="font-display text-[26px] leading-[1.05] tracking-[-0.025em] text-accent">4.9/5</span>
          <span className="text-sm text-muted-foreground">dari 1.200+ potongan</span>
        </p>
      </Reveal>

      <Reveal afterIntro delay={800} className="w-full max-w-[1248px]">
        <LiquidImage
          src="/images/landing/hero-interior.png"
          alt="Interior Pit Stop Barbershop dengan panel biru dan kursi kapster"
          preload
          sizes="(min-width: 1344px) 1248px, 100vw"
          className="h-[240px] w-full rounded-3xl sm:h-[320px] lg:h-[420px]"
        />
      </Reveal>

      <Reveal as="p" afterIntro delay={950} className="text-[13px] font-medium tracking-[1.5px] text-muted-foreground">
        Men &amp; Kids · 10:00–21:00
      </Reveal>
    </section>
  )
}
