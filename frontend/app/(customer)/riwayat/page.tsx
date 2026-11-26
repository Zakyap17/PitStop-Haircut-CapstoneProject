import type { Metadata } from 'next'
import Link from 'next/link'
import { HistoryView } from '@/components/history/history-view'
import { BrandLogo } from '@/components/shared/brand-logo'

export const metadata: Metadata = {
  title: 'Riwayat Booking — Pit Stop Barbershop',
  description: 'Lihat riwayat cukur dan booking dengan nomor WhatsApp, dibuka dengan kode verifikasi.',
  robots: { index: false },
}

export default function HistoryPage() {
  return (
    <main id="konten" className="flex min-h-svh flex-col items-center gap-8 px-6 py-16">
      <BrandLogo href="/" />
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">Booking</p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-[0.01em] uppercase sm:text-5xl">Riwayat cukur</h1>
        <p className="max-w-[480px] leading-normal text-muted-foreground">Lihat kapan terakhir kamu cukur, dengan siapa, dan gaya apa. Dibuka dengan kode verifikasi dari WhatsApp.</p>
      </div>
      <HistoryView />
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Kembali ke beranda
      </Link>
    </main>
  )
}
