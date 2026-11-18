'use client'

import { CalendarCheck } from 'lucide-react'
import { useBookingForm } from '@/hooks/use-booking-form'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

const chip = (selected: boolean) =>
  cn(
    'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35',
    selected ? 'border-accent bg-accent text-accent-foreground' : 'border-foreground/15 hover:border-foreground/40',
  )

const inputClass =
  'rounded-xl border border-input bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none'

export function BookingSection() {
  const form = useBookingForm()

  return (
    <section
      id="reservasi"
      className="relative overflow-hidden border-t border-foreground/10 bg-[radial-gradient(circle_at_20%_0%,oklch(0.35_0.16_264)_0%,var(--background)_60%)] py-24 md:py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Reservasi Online</p>
          <h2 className="font-serif text-5xl leading-none text-balance md:text-6xl">
            Kunci slotmu, <em className="text-accent">skip</em> antrean
          </h2>
          <p className="max-w-md leading-relaxed text-muted-foreground">
            Pilih layanan, jam, dan kapster yang tersedia. E-ticket berisi kode reservasi dikirim ke email kamu untuk
            check-in di kasir.
          </p>
          <div className="rounded-2xl border border-foreground/10 bg-card/60 p-5 text-sm">
            <p className="font-semibold">Aturan kedatangan</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Konfirmasi nama atau email di kasir sebelum layanan dimulai. Jika belum check-in 10 menit sebelum jam
              reservasi, pesanan otomatis dibatalkan dan slot dibuka untuk walk-in.
            </p>
          </div>
          <div className="checker mt-auto hidden h-16 rounded-2xl opacity-60 lg:block" aria-hidden="true" />
        </div>

        <form onSubmit={form.submit} className="flex flex-col gap-7 rounded-3xl border border-foreground/10 bg-card/80 p-6 backdrop-blur md:p-8">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">1. Layanan</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {form.services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => form.setServiceId(service.id)}
                  aria-pressed={form.serviceId === service.id}
                  className={cn(chip(form.serviceId === service.id), 'text-left')}
                >
                  <span className="block">{service.name}</span>
                  <span className="block text-xs opacity-70">{formatRupiah(service.price)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">2. Tanggal & jam</legend>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {form.days.map((day, index) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  aria-pressed={form.dayIndex === index}
                  onClick={() => form.selectDay(index)}
                  className={cn(chip(form.dayIndex === index), 'flex min-w-16 flex-col items-center')}
                >
                  <span className="text-xs opacity-70">{day.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                  <span className="font-serif text-2xl leading-none">{day.getDate()}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {form.timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  disabled={form.isSlotDisabled(slot)}
                  aria-pressed={form.time === slot}
                  onClick={() => form.setTime(slot)}
                  className={chip(form.time === slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">3. Kapster tersedia</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {form.barbers.map((barber) => {
                const available = !form.isBarberOff(barber.offDays)
                return (
                  <button
                    key={barber.name}
                    type="button"
                    disabled={!available}
                    aria-pressed={form.barberName === barber.name}
                    onClick={() => form.setBarberName(barber.name)}
                    className={cn(chip(form.barberName === barber.name), 'text-left')}
                  >
                    <span className="block">{barber.name}</span>
                    <span className="block text-xs opacity-70">{available ? 'Tersedia' : 'Libur'}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold">4. Data pelanggan</legend>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Nama
              <input
                required
                value={form.customerName}
                onChange={(event) => form.setCustomerName(event.target.value)}
                autoComplete="name"
                placeholder="Nama lengkap"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Email
              <input
                required
                type="email"
                value={form.customerEmail}
                onChange={(event) => form.setCustomerEmail(event.target.value)}
                autoComplete="email"
                placeholder="nama@email.com"
                className={inputClass}
              />
            </label>
          </fieldset>

          <div className="flex flex-col items-start justify-between gap-4 border-t border-foreground/10 pt-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs text-muted-foreground">Total bayar di muka</p>
              <p className="font-serif text-3xl">{formatRupiah(form.service.price)}</p>
            </div>
            <button
              type="submit"
              disabled={!form.isValid}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
            >
              <CalendarCheck className="size-4" aria-hidden="true" />
              Konfirmasi Reservasi
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
