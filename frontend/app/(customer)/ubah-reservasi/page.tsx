import type { Metadata } from 'next'
import Link from 'next/link'
import { RescheduleForm } from '@/components/reschedule/reschedule-form'
import { BrandLogo } from '@/components/shared/brand-logo'

export const metadata: Metadata = {
  title: 'Ubah Jadwal Reservasi — Pit Stop Barbershop',
  description: 'Ganti tanggal, jam, atau kapster reservasimu di Pit Stop Barbershop.',
  robots: { index: false },
}

export default function RescheduleReservationPage() {
  return (
    <main id="konten" className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-16">
      <BrandLogo href="/" />
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">Booking</p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-[0.01em] uppercase sm:text-5xl">Ubah jadwal</h1>
        <p className="max-w-[460px] leading-normal text-muted-foreground">
          Pilih tanggal, jam, atau kapster yang baru. Layanan dan data dirimu tidak berubah.
        </p>
      </div>
      <RescheduleForm />
      <Link href="/e-ticket" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Kembali ke e-tiket
      </Link>
    </main>
  )
}
