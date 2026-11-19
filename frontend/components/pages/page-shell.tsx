import Link from 'next/link'
import { PageNav } from '@/components/pages/page-nav'
import { BrandLogo } from '@/components/shared/brand-logo'
import { buttonVariants } from '@/components/ui/button'

type PageShellProps = {
  eyebrow: string
  title: React.ReactNode
  intro: string
  children: React.ReactNode
}

/** Kerangka halaman terpisah (Layanan, Kapster, Galeri): header, judul halaman, isi, dan penutup dengan ajakan reservasi. */
export function PageShell({ eyebrow, title, intro, children }: PageShellProps) {
  return (
    <>
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 md:px-8">
          <BrandLogo href="/" />
          <div className="order-3 w-full md:order-none md:w-auto">
            <PageNav />
          </div>
          <Link href="/#reservasi" className={buttonVariants({ size: 'pill', className: 'px-6 py-2.5' })}>
            Reservasi
          </Link>
        </div>
      </header>

      <main id="konten" className="checker-backdrop relative">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
          <p className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">{eyebrow}</p>
          <h1 className="mt-4 max-w-[16ch] font-display text-5xl leading-[1.02] tracking-[-0.02em] text-balance uppercase sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">{intro}</p>
          <div className="mt-14">{children}</div>
        </div>
      </main>

      <footer>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center md:px-8">
          <div>
            <p className="font-display text-3xl uppercase">Siap masuk pit?</p>
            <p className="mt-1 text-sm text-muted-foreground">Kunci slotmu sekarang. Walk-in tetap dilayani sesuai slot yang tersedia.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/#reservasi" className={buttonVariants({ size: 'pill' })}>
              Reservasi Sekarang
            </Link>
            <Link href="/" className={buttonVariants({ variant: 'outline-strong', size: 'pill', className: 'px-7' })}>
              Ke Beranda
            </Link>
          </div>
        </div>
        <div className="checker h-6 opacity-80" aria-hidden="true" />
      </footer>
    </>
  )
}
