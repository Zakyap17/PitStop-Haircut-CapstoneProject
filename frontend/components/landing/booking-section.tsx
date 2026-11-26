'use client'

import Link from 'next/link'
import { BookingSummary } from '@/components/booking/booking-summary'
import { OtpDialog } from '@/components/booking/otp-dialog'
import { useCatalog } from '@/components/providers/catalog-provider'
import { ScheduleFields } from '@/components/booking/schedule-fields'
import { ServiceList } from '@/components/booking/service-list'
import { StepLegend } from '@/components/booking/step-legend'
import { useBookingForm } from '@/hooks/use-booking-form'

const FORM_ID = 'form-reservasi'

const inputClass =
  'h-12 rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none'

/**
 * Reservasi online: langkah-langkah terbuka di kiri (layanan, tanggal dan jam, kapster, data pelanggan) dan tiket ringkasan
 * di kanan yang terisi langsung saat memilih, lengkap dengan tombol konfirmasi.
 */
export function BookingSection() {
  const form = useBookingForm()
  const { booking: rules } = useCatalog()

  return (
    <section id="reservasi" className="theme-alt relative overflow-hidden bg-background pb-24 md:pb-32">
      <div aria-hidden="true" className="checker-strip h-8" />
      <div className="mx-auto mt-20 max-w-7xl px-4 md:mt-28 md:px-8">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Reservasi Online</p>
            <h2 className="mt-4 font-serif text-5xl leading-none text-balance md:text-6xl">
              Kunci slotmu, <em className="text-accent">skip</em> antrean
            </h2>
          </div>
          <div className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            <p>Pilih layanan, jam, dan kapster. Setelah DP dikonfirmasi, bukti booking dan QR check-in dikirim ke WhatsApp-mu.</p>
            <p className="mt-2">
              Sudah punya kode booking?{' '}
              <Link href="/cek-reservasi" className="text-accent underline underline-offset-4 hover:text-foreground">
                Cek booking
              </Link>
            </p>
          </div>
        </header>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
          <form id={FORM_ID} onSubmit={form.submit} className="surface-paper flex min-w-0 flex-col gap-8 rounded-2xl p-6 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.7)] sm:p-8 md:p-10">
            <fieldset className="min-w-0">
              <StepLegend step={1} title="Layanan" hint="Pilih satu" />
              <ServiceList services={form.services} selectedId={form.serviceId} onSelect={form.setServiceId} />
            </fieldset>

            <ScheduleFields
              schedule={form}
              dateLegend={<StepLegend step={2} title="Tanggal & jam" hint={`${rules.daysAhead} hari ke depan`} />}
              barberLegend={<StepLegend step={3} title="Kapster" />}
            />

            <div className="border-t border-border pt-8">
              <fieldset className="min-w-0">
                <StepLegend step={4} title="Data kamu" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
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
                  <label className="flex flex-col gap-2 text-sm font-medium">
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
                  </label>
                </div>
                <p id="phone-hint" className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Instruksi DP, bukti booking, dan pengingat dikirim otomatis ke nomor ini. Nomor ini juga kunci untuk mengecek bookingmu.
                </p>
              </fieldset>
            </div>
          </form>

          <BookingSummary form={form} formId={FORM_ID} />
          <OtpDialog form={form} />
        </div>
      </div>
    </section>
  )
}
