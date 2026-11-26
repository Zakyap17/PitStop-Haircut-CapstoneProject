'use client'

import { Clock } from 'lucide-react'
import { useCatalog } from '@/components/providers/catalog-provider'
import { Button } from '@/components/ui/button'
import { ANY_BARBER } from '@/hooks/use-schedule-selection'
import type { BookingForm } from '@/hooks/use-booking-form'
import { slotsNeeded } from '@/lib/booking-rules'
import { addMinutesToTime, dotTime, formatRupiah } from '@/lib/format'
import { isValidPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

const label = 'text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase'
/** Tiang barber: garis serong krem dan biru. */
const POLE = { backgroundImage: 'repeating-linear-gradient(135deg, #f3f1ea 0 7px, #3f6fe0 7px 14px)' } as const

/**
 * Tiket ringkasan booking di samping form. Terisi langsung saat pelanggan memilih, memuat total biaya dan tombol konfirmasi,
 * dan menjelaskan apa yang masih kurang kalau tombolnya belum bisa ditekan. Bentuknya mengikuti e-tiket supaya terasa satu rangkaian.
 */
export function BookingSummary({ form, formId }: { form: BookingForm; formId: string }) {
  const { barbers, booking } = useCatalog()
  const { service, time, selectedDay, barberId } = form

  const barberName = barberId === ANY_BARBER ? 'Siapa saja' : (barbers.find((barber) => barber.id === barberId)?.name ?? null)
  const heldMinutes = form.reservedMinutes ?? service.durationMinutes
  const slots = slotsNeeded(service.durationMinutes, booking.timeSlots)
  const dateText = selectedDay ? selectedDay.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : null

  const missing = [
    !time && 'jam',
    !barberId && 'kapster',
    form.customerName.trim().length < 2 && 'nama',
    !isValidPhone(form.customerPhone) && 'nomor WhatsApp',
  ].filter(Boolean) as string[]

  return (
    <aside aria-label="Ringkasan booking" className="lg:sticky lg:top-24">
      <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-card">
        <div aria-hidden="true" className="h-2.5" style={POLE} />

        <div className="px-6 pt-5 pb-6">
          <p className={label}>Tiket booking</p>

          <dl className="mt-5 grid gap-5">
            <div>
              <dt className={label}>Layanan</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-base font-semibold">{service.name}</span>
                <span className="font-display text-lg tabular-nums">{formatRupiah(service.price)}</span>
              </dd>
              <dd className="text-xs text-muted-foreground">
                {service.durationMinutes} menit{slots > 1 && ` · menahan ${slots} slot`}
              </dd>
            </div>

            <div>
              <dt className={label}>Tanggal dan jam</dt>
              <dd className={cn('mt-1 text-base font-semibold', !dateText && 'font-normal text-muted-foreground')}>{dateText ?? 'Pilih tanggal'}</dd>
              {time ? (
                <dd className="mt-1 font-display text-4xl leading-none tabular-nums">{`${dotTime(time)} – ${dotTime(addMinutesToTime(time, heldMinutes))}`}</dd>
              ) : (
                <dd className="mt-0.5 text-sm text-muted-foreground">Pilih jam</dd>
              )}
            </div>

            <div>
              <dt className={label}>Kapster</dt>
              <dd className={cn('mt-1 text-base font-semibold', !barberName && 'font-normal text-muted-foreground')}>{barberName ?? 'Belum dipilih'}</dd>
            </div>

            {form.tryOnChoice && (
              <div>
                <dt className={label}>Gaya pilihan</dt>
                <dd className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="text-base font-semibold">{form.tryOnChoice.name}</span>
                  <button type="button" onClick={form.clearTryOnChoice} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Hapus
                  </button>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* garis sobekan dengan takik, seperti e-tiket */}
        <div aria-hidden="true" className="relative h-0 border-t-2 border-dashed border-border-strong">
          <span className="absolute top-0 -left-3 size-6 -translate-y-1/2 rounded-full border border-border-strong bg-background" />
          <span className="absolute top-0 -right-3 size-6 -translate-y-1/2 rounded-full border border-border-strong bg-background" />
        </div>

        <div className="px-6 pt-6 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className={label}>Total biaya</p>
              <p className="mt-1 font-display text-4xl leading-none tabular-nums">{formatRupiah(service.price)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Slot ditahan sementara. Bayar DP setelah booking dibuat, dan sisanya dibayar di kasir.
          </p>

          {form.submitError && (
            <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-background px-3.5 py-3 text-sm leading-relaxed">
              {form.submitError}
            </p>
          )}

          <Button type="submit" form={formId} size="pill" disabled={!form.isValid} className="mt-5 w-full">
            {form.submitting ? 'Memproses…' : 'Konfirmasi Reservasi'}
          </Button>
          <p aria-live="polite" className="mt-2.5 min-h-4 text-center text-xs text-muted-foreground">
            {!form.isValid && !form.submitting && missing.length > 0 && `Lengkapi dulu: ${missing.join(', ')}.`}
          </p>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Check-in di kasir maksimal 10 menit sebelum jam booking. Lewat dari itu, booking dibatalkan otomatis dan slot dibuka untuk walk-in.
      </p>
    </aside>
  )
}
