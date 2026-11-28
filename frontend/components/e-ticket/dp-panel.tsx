'use client'

import { Clock } from 'lucide-react'
import { PaymentOptions } from '@/components/e-ticket/payment-options'
import { useCatalog } from '@/components/providers/catalog-provider'
import { formatRupiah } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

const label = 'text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase'

/**
 * Panel uang muka (DP): nominal, batas bayar, dan pilihan pembayaran (online atau transfer manual). Tampil selama booking menunggu DP.
 * Kartu putih hangat solid dengan garis amber di kiri sebagai penanda "perlu tindakan". Tanpa transparansi.
 */
type DpPanelProps = {
  reservation: Reservation
  onUpdated: (reservation: Reservation) => void
  returning: 'idle' | 'checking' | 'still-waiting'
}

export function DpPanel({ reservation, onUpdated, returning }: DpPanelProps) {
  const { booking } = useCatalog()
  const { dp } = reservation
  const deadline = dp.payBefore
    ? new Intl.DateTimeFormat('id-ID', { timeZone: booking.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(dp.payBefore))
    : null

  return (
    <section aria-labelledby="dp-title" className="flex w-full max-w-[880px] overflow-hidden rounded-[14px] bg-[#fff6e0] text-ink shadow-[0_14px_32px_-18px_rgba(0,0,0,0.6)]">
      <span aria-hidden="true" className="w-2 shrink-0 bg-amber-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 border-b border-[#efdfae] px-5 py-3.5 sm:px-6">
          <Clock className="size-4 text-amber-700" aria-hidden="true" />
          <h2 id="dp-title" className="text-sm font-semibold">
            Bayar DP untuk mengunci slot
          </h2>
        </div>
        <dl className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-[auto_1fr] sm:px-6">
          <div>
            <dt className={label}>Nominal DP</dt>
            <dd className="mt-1.5 font-display text-4xl leading-none">{formatRupiah(dp.nominal)}</dd>
            <dd className="mt-1 text-xs text-ink-muted">dari total {formatRupiah(reservation.price)}</dd>
          </div>
          <div>
            <dt className={label}>Bayar sebelum</dt>
            <dd className="mt-1.5 text-[15px] leading-snug font-semibold">{deadline ? `${deadline} WIB` : '-'}</dd>
            <dd className="mt-1 text-xs text-ink-muted">Lewat batas ini booking dibatalkan otomatis.</dd>
          </div>
        </dl>
        <PaymentOptions reservation={reservation} onUpdated={onUpdated} returning={returning} />
      </div>
    </section>
  )
}
