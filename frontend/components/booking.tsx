'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, Ticket } from 'lucide-react'
import { barbers, formatRupiah, services, timeSlots } from '@/lib/data'
import { cn } from '@/lib/utils'

type Ticket = { code: string; name: string; email: string; service: string; barber: string; date: string; time: string; price: number }

const buildDays = () => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
}

const chip = (selected: boolean) =>
  cn(
    'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35',
    selected ? 'border-accent bg-accent text-accent-foreground' : 'border-foreground/15 hover:border-foreground/40',
  )

export function Booking() {
  const days = useMemo(buildDays, [])
  const [serviceId, setServiceId] = useState(services[0].id)
  const [dayIndex, setDayIndex] = useState(0)
  const [time, setTime] = useState<string | null>(null)
  const [barber, setBarber] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [ticket, setTicket] = useState<Ticket | null>(null)

  const day = days[dayIndex]
  const service = services.find((s) => s.id === serviceId)!
  const availableBarbers = barbers.filter((b) => !b.offDays.includes(day.getDay()))
  const canSubmit = time && barber && name.trim().length > 1 && /\S+@\S+\.\S+/.test(email)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setTicket({
      code: `PS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name: name.trim(),
      email,
      service: service.name,
      barber,
      date: day.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
      time,
      price: service.price,
    })
  }

  return (
    <section id="reservasi" className="relative overflow-hidden border-t border-foreground/10 bg-[radial-gradient(circle_at_20%_0%,oklch(0.35_0.16_264)_0%,var(--background)_60%)] py-24 md:py-32">
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

        {ticket ? (
          <div className="flex flex-col gap-6 rounded-3xl border border-accent/40 bg-card p-6 md:p-8" role="status">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Ticket className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-serif text-3xl leading-none">E-Ticket Pit Stop</p>
                <p className="mt-1 text-sm text-muted-foreground">Ringkasan reservasi untuk {ticket.email}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-foreground/20 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kode Reservasi</p>
              <p className="mt-1 font-mono text-4xl font-semibold tracking-widest text-accent">{ticket.code}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Nama', ticket.name],
                ['Layanan', ticket.service],
                ['Kapster', ticket.barber],
                ['Tanggal', ticket.date],
                ['Jam', ticket.time],
                ['Total', formatRupiah(ticket.price)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="rounded-xl bg-primary/15 p-4 text-sm text-muted-foreground">
              Langkah berikutnya: pembayaran di muka untuk mengunci slot. Modul payment gateway &amp; email otomatis akan
              dihubungkan di tahap backend.
            </p>
            <button
              type="button"
              onClick={() => setTicket(null)}
              className="w-fit rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-semibold hover:bg-foreground/5"
            >
              Buat reservasi lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-7 rounded-3xl border border-foreground/10 bg-card/80 p-6 backdrop-blur md:p-8">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">1. Layanan</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {services.map((s) => (
                  <button key={s.id} type="button" onClick={() => setServiceId(s.id)} aria-pressed={serviceId === s.id} className={cn(chip(serviceId === s.id), 'text-left')}>
                    <span className="block">{s.name}</span>
                    <span className="block text-xs opacity-70">{formatRupiah(s.price)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">2. Tanggal & jam</legend>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d, i) => (
                  <button
                    key={d.toISOString()}
                    type="button"
                    aria-pressed={dayIndex === i}
                    onClick={() => {
                      setDayIndex(i)
                      setBarber(null)
                    }}
                    className={cn(chip(dayIndex === i), 'flex min-w-16 flex-col items-center')}
                  >
                    <span className="text-xs opacity-70">{d.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                    <span className="font-serif text-2xl leading-none">{d.getDate()}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {timeSlots.map((slot) => (
                  <button key={slot} type="button" aria-pressed={time === slot} onClick={() => setTime(slot)} className={chip(time === slot)}>
                    {slot}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">3. Kapster tersedia</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {barbers.map((b) => {
                  const available = availableBarbers.includes(b)
                  return (
                    <button
                      key={b.name}
                      type="button"
                      disabled={!available}
                      aria-pressed={barber === b.name}
                      onClick={() => setBarber(b.name)}
                      className={cn(chip(barber === b.name), 'text-left')}
                    >
                      <span className="block">{b.name}</span>
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Nama lengkap"
                  className="rounded-xl border border-input bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="nama@email.com"
                  className="rounded-xl border border-input bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none"
                />
              </label>
            </fieldset>

            <div className="flex flex-col items-start justify-between gap-4 border-t border-foreground/10 pt-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs text-muted-foreground">Total bayar di muka</p>
                <p className="font-serif text-3xl">{formatRupiah(service.price)}</p>
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
              >
                <CalendarCheck className="size-4" aria-hidden="true" />
                Konfirmasi Reservasi
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
