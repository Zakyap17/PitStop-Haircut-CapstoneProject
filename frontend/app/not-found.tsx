import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLogo } from '@/components/shared/brand-logo'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Halaman tidak ditemukan — Pit Stop Barbershop', robots: { index: false } }

export default function NotFound() {
  return (
    <main id="konten" className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 pb-16 text-center">
      <BrandLogo href="/" />
      <p className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">Salah belokan</p>
      <h1 className="font-display text-[clamp(7rem,26vw,16rem)] leading-[0.85] tracking-[-0.03em]">404</h1>
      <p className="max-w-[440px] leading-normal text-muted-foreground">Halaman yang kamu cari tidak ada atau sudah pindah. Kembali ke pit dan coba lagi.</p>
      <Link href="/" className={buttonVariants({ size: 'pill' })}>
        Kembali ke beranda
      </Link>
      <div aria-hidden="true" className="checker-strip fixed inset-x-0 bottom-0 h-8" />
    </main>
  )
}
