import { Flag } from 'lucide-react'
import { TicketQr } from '@/components/e-ticket/ticket-qr'
import { BrandLogo } from '@/components/shared/brand-logo'
import { addMinutesToTime, formatRupiah, fromIsoDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/types/reservation'

type TicketCardProps = {
  reservation: Reservation
  /** Booking dibatalkan: tiket diredam dan QR tidak ditampilkan. */
  cancelled?: boolean
  /** DP belum dibayar: QR diredam karena belum berlaku. */
  awaitingDp?: boolean
}

const label = 'text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase'

/** Lingkaran seukuran takik di garis sobekan; warnanya sama dengan latar halaman sehingga tampak seperti tiket yang digunting. */
const notch = 'absolute z-20 size-6 rounded-full border border-border bg-background'

/**
 * Tiket: bagian kiri memuat jadwal dan rincian (tanggal dan jam paling besar), dipisah garis sobekan dari "stub" di kanan
 * yang memuat kode dan QR untuk kasir. Garis kotak-kotak di tepi bawah adalah ciri Pit Stop.
 */
export function TicketCard({ reservation, cancelled = false, awaitingDp = false }: TicketCardProps) {
  const date = fromIsoDate(reservation.date)
  const weekday = date.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const endTime = addMinutesToTime(reservation.time, reservation.reservedMinutes ?? reservation.durationMinutes)
  const hasDp = reservation.dp.nominal > 0
  const dpPaid = reservation.dp.status === 'dibayar'
  const dpStatusLabel = dpPaid ? 'sudah dibayar' : awaitingDp ? 'belum dibayar' : null

  return (
    <article
      aria-label={`E-tiket booking ${reservation.code}`}
      className={cn('relative flex w-full max-w-[880px] flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] md:flex-row', cancelled && 'opacity-60 grayscale')}
    >
      {/* pita garis finish di tepi atas, ciri khas Pit Stop */}
      <div aria-hidden="true" className="checker-light absolute inset-x-0 top-0 z-10 h-4 opacity-90" style={{ backgroundSize: '16px 16px' }} />

      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        {/* kotak-kotak besar yang memudar ke kiri bawah, seperti bendera finish di belakang tiket */}
        <div
          aria-hidden="true"
          className="checker-light absolute inset-0 -z-10 opacity-[0.07]"
          style={{ backgroundSize: '64px 64px', maskImage: 'linear-gradient(120deg, transparent 30%, black 95%)', WebkitMaskImage: 'linear-gradient(120deg, transparent 30%, black 95%)' }}
        />
        <div className="flex items-center justify-between gap-4 px-6 pt-10 sm:px-9">
          <BrandLogo />
          <span className="inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-foreground uppercase">
            <Flag className="size-3.5 text-accent" aria-hidden="true" />
            Pit Stop Pass
          </span>
        </div>

        <dl className="grid gap-x-8 gap-y-6 px-6 py-7 sm:px-9">
          <div className="grid grid-cols-[1fr_auto] items-end gap-6 border-b border-border pb-6">
            <div>
              <dt className={label}>Tanggal</dt>
              <dd className="mt-2 font-display text-4xl leading-none tracking-[0.01em] uppercase sm:text-[44px]">{weekday}</dd>
              <dd className="mt-1.5 text-base text-muted-foreground">{fullDate}</dd>
            </div>
            <div className="text-right">
              <dt className={label}>Jam</dt>
              <dd className="mt-2 font-display text-4xl leading-none tracking-[0.01em] sm:text-[44px]">{reservation.time.replace(':', '.')}</dd>
              <dd className="mt-1.5 text-base text-muted-foreground">s/d {endTime.replace(':', '.')} WIB</dd>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <dt className={label}>Layanan</dt>
              <dd className="mt-1.5 text-[15px] leading-snug font-semibold">{reservation.serviceName}</dd>
              <dd className="text-sm text-muted-foreground">{reservation.durationMinutes} menit</dd>
            </div>
            <div>
              <dt className={label}>Kapster</dt>
              <dd className="mt-1.5 text-[15px] leading-snug font-semibold">{reservation.barberName}</dd>
            </div>
            <div>
              <dt className={label}>Atas nama</dt>
              <dd className="mt-1.5 text-[15px] leading-snug font-semibold break-words">{reservation.customerName}</dd>
            </div>
            {reservation.hairstyle && (
              <div>
                <dt className={label}>Gaya pilihan</dt>
                <dd className="mt-1.5 text-[15px] leading-snug font-semibold">{reservation.hairstyle}</dd>
              </div>
            )}
          </div>
        </dl>

        <dl className="mt-auto grid grid-cols-3 gap-4 border-t border-border bg-foreground/[0.03] px-6 py-4 sm:px-9">
          <div>
            <dt className={label}>Total</dt>
            <dd className="mt-1 text-[15px] font-semibold">{formatRupiah(reservation.price)}</dd>
          </div>
          {hasDp ? (
            <>
              <div>
                <dt className={label}>DP</dt>
                <dd className="mt-1 text-[15px] font-semibold">{formatRupiah(reservation.dp.nominal)}</dd>
                {dpStatusLabel && <dd className={cn('text-xs', dpPaid ? 'text-emerald-300' : 'text-amber-300')}>{dpStatusLabel}</dd>}
              </div>
              <div>
                <dt className={label}>Sisa</dt>
                <dd className="mt-1 text-[15px] font-semibold">{formatRupiah(reservation.price - reservation.dp.nominal)}</dd>
                <dd className="text-xs text-muted-foreground">dibayar di kasir</dd>
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <dt className={label}>Pembayaran</dt>
              <dd className="mt-1 text-[15px] font-semibold">Di kasir</dd>
            </div>
          )}
        </dl>
      </div>

      {/* garis sobekan dengan takik */}
      <div aria-hidden="true" className="relative h-0 w-full border-t-2 border-dashed border-border-strong md:h-auto md:w-0 md:self-stretch md:border-t-0 md:border-l-2">
        <span className={cn(notch, '-left-3 top-0 -translate-y-1/2 md:top-0 md:left-0 md:-translate-x-1/2 md:-translate-y-1/2')} />
        <span className={cn(notch, '-right-3 top-0 -translate-y-1/2 md:top-auto md:right-auto md:bottom-0 md:left-0 md:-translate-x-1/2 md:translate-y-1/2')} />
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-4 bg-foreground/[0.04] px-6 pt-12 pb-8 md:w-[300px]">
        <div className="flex flex-col items-center gap-2">
          <p className={label}>Kode booking</p>
          <p className={cn('font-display text-[44px] leading-none tracking-[0.06em]', cancelled && 'line-through')}>{reservation.code}</p>
        </div>

        {cancelled ? (
          <p className="rounded-full border border-red-300/40 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-red-200 uppercase">Dibatalkan</p>
        ) : (
          <div className={cn('transition-opacity', awaitingDp && 'opacity-30')}>
            <TicketQr value={reservation.code} size={176} />
          </div>
        )}

        <p className="max-w-[220px] text-center text-xs leading-relaxed text-muted-foreground">
          {cancelled ? 'Kode ini tidak berlaku lagi.' : awaitingDp ? 'QR aktif setelah DP dikonfirmasi admin.' : 'Tunjukkan ke kasir. Check-in maksimal 10 menit sebelum jadwal.'}
        </p>
      </div>
    </article>
  )
}
