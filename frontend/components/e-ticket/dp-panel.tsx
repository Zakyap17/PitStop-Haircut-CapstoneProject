'use client'

import { Clock } from 'lucide-react'
import { useCatalog } from '@/components/providers/catalog-provider'
import { formatRupiah } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

const label = 'text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase'

/** Panel uang muka (DP): nominal, batas bayar, dan cara bayar. Tampil selama booking menunggu DP. */
export function DpPanel({ reservation }: { reservation: Reservation }) {
  const { booking } = useCatalog()
  const { dp } = reservation
  const deadline = dp.payBefore
    ? new Intl.DateTimeFormat('id-ID', { timeZone: booking.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(dp.payBefore))
    : null

  return (
    <section aria-labelledby="dp-title" className="w-full max-w-[880px] overflow-hidden rounded-2xl border border-amber-300/30 bg-amber-400/[0.07]">
      <div className="flex items-center gap-2.5 border-b border-amber-300/20 px-5 py-3.5 sm:px-6">
        <Clock className="size-4 text-amber-200" aria-hidden="true" />
        <h2 id="dp-title" className="text-sm font-semibold">
          Bayar DP untuk mengunci slot
        </h2>
      </div>
      <dl className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-[auto_1fr_1fr] sm:px-6">
        <div>
          <dt className={label}>Nominal DP</dt>
          <dd className="mt-1.5 font-display text-4xl leading-none">{formatRupiah(dp.nominal)}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">dari total {formatRupiah(reservation.price)}</dd>
        </div>
        <div>
          <dt className={label}>Bayar sebelum</dt>
          <dd className="mt-1.5 text-[15px] leading-snug font-semibold">{deadline ? `${deadline} WIB` : '-'}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">Lewat batas ini booking dibatalkan otomatis.</dd>
        </div>
        <div>
          <dt className={label}>Cara bayar</dt>
          <dd className="mt-1.5 text-[15px] leading-snug font-semibold">{dp.instruction ?? 'Hubungi kasir'}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">Setelah dikonfirmasi admin, bukti booking dikirim ke WhatsApp.</dd>
        </div>
      </dl>
    </section>
  )
}
