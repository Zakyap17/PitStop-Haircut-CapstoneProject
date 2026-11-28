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

const label = 'text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase'

/** Garis kotak-kotak ala garis finish dengan tinta navy; kotak lainnya transparan sehingga warna di bawahnya terlihat. */
const finishLine = (size: number) => ({
  backgroundImage: 'conic-gradient(var(--ink) 25%, transparent 0 50%, var(--ink) 0 75%, transparent 0)',
  backgroundSize: `${size}px ${size}px`,
})

/** Lingkaran takik di garis sobekan; warnanya sama dengan latar halaman sehingga tampak seperti tiket yang digunting. */
const notch = 'absolute z-20 size-6 rounded-full bg-background'

/**
 * Tiket kertas: bagian kiri putih krem dengan tinta navy memuat jadwal (tanggal dan jam paling besar), rincian, dan ringkasan pembayaran.
 * Dipisah garis sobekan dari "stub" biru solid di kanan yang memuat kode dan QR untuk kasir. Pita garis finish di tepi atas adalah ciri Pit Stop.
 * Semua permukaan solid, tanpa transparansi atau blur.
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
      className={cn(
        'relative flex w-full max-w-[880px] flex-col overflow-hidden rounded-[20px] bg-paper text-ink shadow-[0_20px_44px_-20px_rgba(0,0,0,0.7)] md:flex-row',
        cancelled && 'opacity-70 grayscale',
      )}
    >
      {/* pita garis finish di tepi atas */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-4" style={finishLine(16)} />

      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        {/* kotak-kotak besar yang memudar ke kiri bawah, seperti bendera finish di belakang tiket */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.05]"
          style={{ ...finishLine(64), maskImage: 'linear-gradient(120deg, transparent 30%, black 95%)', WebkitMaskImage: 'linear-gradient(120deg, transparent 30%, black 95%)' }}
        />
        <div className="flex items-center justify-between gap-4 px-6 pt-10 sm:px-9">
          <BrandLogo onLight />
          <span className="hidden items-center gap-2 rounded-full border border-ink/30 px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] whitespace-nowrap uppercase min-[460px]:inline-flex">
            <Flag className="size-3.5 text-primary" aria-hidden="true" />
            Pit Stop Pass
          </span>
        </div>

        <div className="grid gap-y-6 px-6 py-7 sm:px-9">
          <dl className="grid grid-cols-[1fr_auto] items-end gap-6 border-b border-paper-line pb-6">
            <div>
              <dt className={label}>Tanggal</dt>
              <dd className="mt-2 font-display text-4xl leading-none tracking-[0.01em] uppercase sm:text-[44px]">{weekday}</dd>
              <dd className="mt-1.5 text-base text-ink-muted">{fullDate}</dd>
            </div>
            <div className="text-right">
              <dt className={label}>Jam</dt>
              <dd className="mt-2 font-display text-4xl leading-none tracking-[0.01em] sm:text-[44px]">{reservation.time.replace(':', '.')}</dd>
              <dd className="mt-1.5 text-base text-ink-muted">s/d {endTime.replace(':', '.')} WIB</dd>
            </div>
          </dl>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <dt className={label}>Layanan</dt>
              <dd className="mt-1.5 text-[15px] leading-snug font-semibold">{reservation.serviceName}</dd>
              <dd className="text-sm text-ink-muted">{reservation.durationMinutes} menit</dd>
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
          </dl>
        </div>

        <dl className="mt-auto grid grid-cols-3 gap-4 border-t border-paper-line bg-paper-dim px-6 py-4 sm:px-9">
          <div>
            <dt className={label}>Total</dt>
            <dd className="mt-1 text-[15px] font-semibold">{formatRupiah(reservation.price)}</dd>
          </div>
          {hasDp ? (
            <>
              <div>
                <dt className={label}>DP</dt>
                <dd className="mt-1 text-[15px] font-semibold">{formatRupiah(reservation.dp.nominal)}</dd>
                {dpStatusLabel && <dd className={cn('text-xs font-medium', dpPaid ? 'text-emerald-800' : 'text-amber-800')}>{dpStatusLabel}</dd>}
              </div>
              <div>
                <dt className={label}>Sisa</dt>
                <dd className="mt-1 text-[15px] font-semibold">{formatRupiah(reservation.price - reservation.dp.nominal)}</dd>
                <dd className="text-xs text-ink-muted">dibayar di kasir</dd>
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
      <div aria-hidden="true" className="relative h-0 w-full border-t-2 border-dashed border-ink/25 md:h-auto md:w-0 md:self-stretch md:border-t-0 md:border-l-2">
        <span className={cn(notch, '-left-3 top-0 -translate-y-1/2 md:top-0 md:left-0 md:-translate-x-1/2 md:-translate-y-1/2')} />
        <span className={cn(notch, '-right-3 top-0 -translate-y-1/2 md:top-auto md:right-auto md:bottom-0 md:left-0 md:-translate-x-1/2 md:translate-y-1/2')} />
      </div>

      {/* stub biru solid: kode booking dan QR */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-4 bg-primary px-6 pt-12 pb-8 text-primary-foreground md:w-[300px]">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-medium tracking-[0.18em] text-white/85 uppercase">Kode booking</p>
          <p className={cn('font-display text-[44px] leading-none tracking-[0.06em]', cancelled && 'line-through')}>{reservation.code}</p>
        </div>

        {cancelled ? (
          <p className="rounded-full border border-white/60 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase">Dibatalkan</p>
        ) : (
          // QR selalu penuh kontras (Carbon di atas Porcelain solid). Jangan diredam dengan opacity: biru stub menembus dan QR sulit dipindai.
          <div className="rounded-xl bg-paper p-2">
            <TicketQr value={reservation.code} size={176} />
          </div>
        )}
        {awaitingDp && !cancelled && (
          <p className="rounded-full border border-white/70 px-3.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">Belum aktif</p>
        )}

        <p className="max-w-[220px] text-center text-xs leading-relaxed text-white">
          {cancelled ? 'Kode ini tidak berlaku lagi.' : awaitingDp ? 'QR aktif setelah DP dikonfirmasi admin.' : 'Tunjukkan ke kasir. Check-in maksimal 10 menit sebelum jadwal.'}
        </p>
      </div>
    </article>
  )
}
