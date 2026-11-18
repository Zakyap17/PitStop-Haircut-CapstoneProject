import type { Metadata } from 'next'
import { ETicketView } from '@/components/e-ticket/e-ticket-view'

export const metadata: Metadata = {
  title: 'E-Tiket Reservasi — Pit Stop Barbershop',
  description: 'E-tiket reservasi Pit Stop Barbershop. Tunjukkan kode reservasi ke kasir saat datang.',
}

export default function ETicketPage() {
  return (
    <main id="konten" className="flex min-h-svh flex-col items-center justify-center px-6 py-16 lg:py-24">
      <ETicketView />
    </main>
  )
}
