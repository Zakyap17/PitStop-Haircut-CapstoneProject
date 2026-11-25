'use client'

import { Clock } from 'lucide-react'
import { useCatalog } from '@/components/providers/catalog-provider'
import { formatRupiah } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

/** Panel uang muka (DP): nominal, batas bayar, dan cara bayar. Tampil selama booking menunggu DP. */
export function DpPanel({ reservation }: { reservation: Reservation }) {
  const { booking } = useCatalog()
  const { dp } = reservation
  const deadline = dp.payBefore
    ? new Intl.DateTimeFormat('id-ID', { timeZone: booking.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(dp.payBefore))
    : null

  return (
    <section aria-label="Pembayaran DP" className="flex w-full max-w-[882px] flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Clock className="size-5 text-accent" aria-hidden="true" />
        Bayar DP {formatRupiah(dp.nominal)} untuk mengunci slot
      </h2>
      {deadline && (
        <p className="text-sm leading-relaxed">
          Bayar sebelum <strong>{deadline} WIB</strong>. Lewat batas itu booking dibatalkan otomatis dan slotnya dibuka untuk orang lain.
        </p>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        {dp.instruction ?? 'Hubungi kasir untuk informasi cara pembayaran DP.'} Setelah DP dikonfirmasi admin, bukti booking dikirim ke WhatsApp-mu dan e-tiket ini menjadi berlaku.
      </p>
      <p className="text-sm text-muted-foreground">
        Total biaya {formatRupiah(reservation.price)}; sisanya {formatRupiah(reservation.price - dp.nominal)} dibayar di kasir.
      </p>
    </section>
  )
}
