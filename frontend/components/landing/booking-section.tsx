'use client'

import Link from 'next/link'
import { CalendarCheck } from 'lucide-react'
import { ScheduleFields, chipClass } from '@/components/booking/schedule-fields'
import { useBookingForm } from '@/hooks/use-booking-form'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

const inputClass =
  'rounded-xl border border-input bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none'

export function BookingSection() {
  const form = useBookingForm()

  return (
    <section
      id="reservasi"
      className="theme-alt checker-backdrop relative overflow-hidden border-t border-foreground/10 bg-[radial-gradient(circle_at_20%_0%,oklch(0.34_0.1_250)_0%,var(--background)_60%)] py-24 md:py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Reservasi Online</p>
          <h2 className="font-serif text-5xl leading-none text-balance md:text-6xl">
            Kunci slotmu, <em className="text-accent">skip</em> antrean
          </h2>
          <p className="max-w-md leading-relaxed text-muted-foreground">
            Pilih layanan, jam, dan kapster yang tersedia. Slotmu ditahan sampai DP dibayar. Setelah DP dikonfirmasi, bukti booking berisi kode dan QR untuk
            check-in dikirim ke WhatsApp-mu.
          </p>
          <div className="rounded-2xl border border-foreground/10 bg-card/60 p-5 text-sm">
            <p className="font-semibold">Aturan kedatangan</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Konfirmasi nama atau nomor WhatsApp di kasir sebelum layanan dimulai. Jika belum check-in 10 menit sebelum jam
              reservasi, pesanan otomatis dibatalkan dan slot dibuka untuk walk-in.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Sudah punya kode reservasi?{' '}
            <Link href="/cek-reservasi" className="text-accent underline underline-offset-4 hover:text-foreground">
              Cek reservasi
            </Link>
          </p>
          <div className="checker mt-auto hidden h-16 rounded-2xl opacity-60 lg:block" aria-hidden="true" />
        </div>

        <form onSubmit={form.submit} className="flex min-w-0 flex-col gap-7 rounded-3xl border border-foreground/10 bg-card/80 p-6 backdrop-blur md:p-8">
          {form.tryOnChoice && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
              <p>
                <span className="text-muted-foreground">Gaya pilihanmu dari Try-On: </span>
                <span className="font-semibold">{form.tryOnChoice.name}</span>
                <span className="text-muted-foreground"> · kapster {form.tryOnChoice.barber}</span>
              </p>
              <button type="button" onClick={form.clearTryOnChoice} className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Hapus
              </button>
            </div>
          )}
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">1. Layanan</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {form.services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => form.setServiceId(service.id)}
                  aria-pressed={form.serviceId === service.id}
                  className={cn(chipClass(form.serviceId === service.id), 'text-left')}
                >
                  <span className="block">{service.name}</span>
                  <span className="block text-xs opacity-70">{formatRupiah(service.price)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <ScheduleFields schedule={form} dateLegend="2. Tanggal & jam" barberLegend="3. Kapster tersedia" />

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
              Nomor WhatsApp
              <input
                required
                type="tel"
                inputMode="tel"
                value={form.customerPhone}
                onChange={(event) => form.setCustomerPhone(event.target.value)}
                autoComplete="tel"
                placeholder="081234567890"
                aria-describedby="phone-hint"
                className={inputClass}
              />
              <span id="phone-hint">Instruksi DP, bukti booking, dan pengingat dikirim otomatis ke nomor ini. Nomor ini juga kunci untuk mengecek bookingmu.</span>
            </label>
          </fieldset>

          {form.submitError && (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-relaxed">
              {form.submitError}
            </p>
          )}

          <div className="flex flex-col items-start justify-between gap-4 border-t border-foreground/10 pt-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs text-muted-foreground">Total biaya</p>
              <p className="font-serif text-3xl">{formatRupiah(form.service.price)}</p>
            </div>
            <button
              type="submit"
              disabled={!form.isValid}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
            >
              <CalendarCheck className="size-4" aria-hidden="true" />
              {form.submitting ? 'Memproses…' : 'Konfirmasi Reservasi'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
