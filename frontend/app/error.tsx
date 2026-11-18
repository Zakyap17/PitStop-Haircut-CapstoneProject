'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Button, buttonVariants } from '@/components/ui/button'

/** Tampil saat ada error tak terduga di sebuah halaman. `reset` mencoba memuat ulang bagian yang error. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="konten" className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <BrandLogo href="/" />
      <h1 className="font-display text-5xl leading-[1.05] tracking-[-0.025em] uppercase sm:text-6xl">Ban-nya bocor.</h1>
      <p className="max-w-[440px] leading-normal text-muted-foreground">Terjadi gangguan saat memuat halaman ini. Coba lagi, atau kembali ke beranda.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="pill" onClick={reset}>
          Coba lagi
        </Button>
        <Link href="/" className={buttonVariants({ variant: 'outline-strong', size: 'pill' })}>
          Beranda
        </Link>
      </div>
    </main>
  )
}
