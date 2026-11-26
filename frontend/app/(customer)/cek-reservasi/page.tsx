import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckReservationForm } from '@/components/check-reservation/check-reservation-form'
import { BrandLogo } from '@/components/shared/brand-logo'

export const metadata: Metadata = {
  title: 'Cek Booking — Pit Stop Barbershop',
  description: 'Buka kembali e-tiket bookingmu dengan kode booking dan nomor WhatsApp.',
}

export default function CheckReservationPage() {
  return (
    <main id="konten" className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-16">
      <BrandLogo href="/" />
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">Booking</p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-[0.01em] uppercase sm:text-5xl">Cek booking</h1>
        <p className="max-w-[460px] leading-normal text-muted-foreground">
          Masukkan kode booking dan nomor WhatsApp yang kamu pakai saat memesan untuk membuka e-tiketmu lagi.
        </p>
      </div>
      <CheckReservationForm />
      <p className="text-sm text-muted-foreground">
        Lupa kodenya?{' '}
        <Link href="/riwayat" className="text-accent underline underline-offset-4 hover:text-foreground">
          Lihat riwayat pakai nomor WhatsApp
        </Link>
      </p>
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Kembali ke beranda
      </Link>
    </main>
  )
}
