import { BrandLogo } from '@/components/shared/brand-logo'
import { cn } from '@/lib/utils'
import { formatLongDate, formatRupiah, fromIsoDate } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

/** Kartu e-tiket: detail reservasi di kiri, kode + QR di kanan, dipisah garis perforasi. */
export function TicketCard({ reservation, cancelled = false }: { reservation: Reservation; cancelled?: boolean }) {
  const rows = [
    { label: 'Layanan', value: `${reservation.serviceName} · ${reservation.durationMinutes} menit` },
    { label: 'Tanggal & jam', value: `${formatLongDate(fromIsoDate(reservation.date))} · ${reservation.time}` },
    { label: 'Kapster', value: reservation.barberName },
    { label: 'Atas nama', value: reservation.customerName },
    ...(reservation.hairstyle ? [{ label: 'Gaya pilihan', value: reservation.hairstyle }] : []),
    { label: 'Biaya layanan', value: formatRupiah(reservation.price) },
  ]

  return (
    <article
      aria-label={`E-tiket reservasi ${reservation.code}`}
      className={cn('flex w-full max-w-[882px] flex-col overflow-hidden rounded-3xl border border-border bg-card md:flex-row', cancelled && 'opacity-60 grayscale')}
    >
      <div className="flex flex-1 flex-col gap-[22px] px-6 py-8 sm:px-10 sm:py-9">
        <BrandLogo />
        <dl className="flex flex-col gap-[22px]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-right text-[15px] font-semibold text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div aria-hidden="true" className="h-0.5 bg-border-strong md:h-auto md:w-0.5" />

      <div className="flex flex-col items-center justify-center gap-3.5 px-6 py-8 sm:px-10 sm:py-9 md:w-[320px] md:shrink-0">
        <p className="text-xs font-medium tracking-[1.6px] text-muted-foreground uppercase">Kode reservasi</p>
        <p className={cn('font-display text-5xl tracking-[1px] text-accent', cancelled && 'line-through')}>{reservation.code}</p>
        {cancelled && <p className="rounded-full border border-destructive px-4 py-1 text-xs font-semibold tracking-[1.6px] text-destructive uppercase">Dibatalkan</p>}
        {/* Placeholder QR sesuai Figma. Ganti dengan QR asli yang dibuat backend. */}
        {!cancelled && (
          <div role="img" aria-label="QR code (placeholder)" className="flex size-[168px] items-center justify-center rounded-xl bg-foreground">
            <div className="flex size-[148px] items-center justify-center rounded-md bg-background">
              <span className="font-display text-[40px] text-muted-foreground">QR</span>
            </div>
          </div>
        )}
        <p className="max-w-[240px] text-center text-xs text-muted-foreground">
          {cancelled ? 'Kode ini tidak berlaku lagi.' : 'Check-in maks. 10 menit sebelum jadwal'}
        </p>
      </div>
    </article>
  )
}
