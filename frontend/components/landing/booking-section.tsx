'use client'

import { Reveal } from '@/components/shared/reveal'
import { SectionContainer } from '@/components/shared/section-container'
import { SectionHeading } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { useBookingForm } from '@/hooks/use-booking-form'
import { formatDayChip, formatRupiah } from '@/lib/format'

const stepLabelClass = 'text-[13px] font-semibold tracking-[1.6px] text-accent uppercase'
const inputClass =
  'w-full rounded-xl border border-border bg-muted px-[18px] py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none'

export function BookingSection() {
  const form = useBookingForm()

  const scheduleSummary = form.selectedDay && form.time ? `${formatDayChip(form.selectedDay)} · ${form.time}` : '—'

  return (
    <SectionContainer id="reservasi" className="bg-card">
      <SectionHeading
        eyebrow="Reservasi online"
        title="Kunci slotmu, skip antrean."
        description="Konfirmasi nama atau email di kasir. Booking yang tidak check-in 10 menit sebelum jadwal dibatalkan otomatis."
      />

      <form onSubmit={form.submit} className="grid w-full items-start gap-6 lg:grid-cols-[1fr_424px]">
        <Reveal className="flex flex-col gap-7 rounded-[20px] border border-border bg-background p-6 sm:p-8">
          <fieldset className="flex flex-col gap-3">
            <legend className={`${stepLabelClass} mb-3`}>01 &nbsp;Layanan</legend>
            <div className="flex flex-wrap gap-x-2.5 gap-y-2">
              {form.services.map((service) => (
                <Chip key={service.id} selected={form.serviceId === service.id} onClick={() => form.setServiceId(service.id)}>
                  {service.name}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className={`${stepLabelClass} mb-3`}>02 &nbsp;Tanggal &amp; jam</legend>
            <div className="flex flex-wrap gap-2">
              {form.days.map((day, index) => (
                <Chip key={day.toISOString()} selected={form.dayIndex === index} onClick={() => form.selectDay(index)}>
                  {form.dayLabel(day)}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {form.timeSlots.map((slot) => (
                <Chip key={slot} selected={form.time === slot} disabled={form.isSlotDisabled(slot)} onClick={() => form.setTime(slot)}>
                  {slot}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className={`${stepLabelClass} mb-3`}>03 &nbsp;Kapster</legend>
            <div className="flex flex-wrap gap-2.5">
              {form.barbers.map((barber) => {
                const isOff = form.isBarberOff(barber.dayOff)
                return (
                  <Chip key={barber.name} selected={form.barberName === barber.name} disabled={isOff} onClick={() => form.setBarberName(barber.name)}>
                    {barber.name}
                    {isOff && ' · libur'}
                  </Chip>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className={`${stepLabelClass} mb-3`}>04 &nbsp;Data diri</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                aria-label="Nama lengkap"
                autoComplete="name"
                placeholder="Nama lengkap"
                value={form.customerName}
                onChange={(event) => form.setCustomerName(event.target.value)}
                className={inputClass}
              />
              <input
                required
                type="email"
                aria-label="Email"
                autoComplete="email"
                placeholder="Email"
                value={form.customerEmail}
                onChange={(event) => form.setCustomerEmail(event.target.value)}
                className={inputClass}
              />
            </div>
          </fieldset>
        </Reveal>

        <Reveal as="aside" delay={150} className="flex flex-col gap-5 rounded-[20px] border border-border bg-background p-6 sm:p-8">
          <p className={stepLabelClass}>Ringkasan</p>
          <SummaryRow label="Layanan" value={form.service.name} />
          <SummaryRow label="Jadwal" value={scheduleSummary} />
          <SummaryRow label="Kapster" value={form.barberName ?? '—'} />
          <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">Total dibayar di muka</p>
            <p className="font-display text-[32px] leading-[1.05] tracking-[-0.025em] text-accent uppercase">{formatRupiah(form.service.price)}</p>
          </div>
          <Button type="submit" size="pill" disabled={!form.isValid} className="w-full">
            Konfirmasi Reservasi
          </Button>
          <p className="text-[13px] text-muted-foreground">E-tiket dengan kode reservasi dikirim ke email.</p>
        </Reveal>
      </form>
    </SectionContainer>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[15px]">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-right font-medium text-foreground">{value}</p>
    </div>
  )
}
