import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Reveal, RevealHeading } from '@/components/shared/reveal'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CtaBand() {
  return (
    <section className="flex flex-col items-center gap-7 bg-primary px-6 py-16 md:px-12 lg:px-24 lg:py-[88px]">
      <RevealHeading
        text="Rambut sudah waktunya ganti ban?"
        className="max-w-[900px] text-center font-display text-5xl leading-[1.05] tracking-[-0.025em] text-balance text-white uppercase sm:text-6xl lg:text-[72px]"
      />
      <Reveal delay={350}>
        <Link href="#reservasi" className={cn(buttonVariants({ variant: 'light', size: 'pill' }), 'px-8 py-4 text-[15px]')}>
          Reservasi sekarang
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </Reveal>
    </section>
  )
}
