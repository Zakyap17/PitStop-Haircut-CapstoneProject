'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { StatusChip } from '@/components/e-ticket/status-chip'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { isReservationPast } from '@/lib/booking-rules'
import { formatLongDate, formatRupiah, fromIsoDate } from '@/lib/format'
import { isValidPhone } from '@/lib/phone'
import { setCurrentReservation } from '@/lib/reservation-storage'
import type { History, Reservation, ReservationStatus } from '@/types/reservation'

const inputClass =
  'h-12 w-full rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none'

const STATUS: Record<ReservationStatus, { label: string; tone: 'waiting' | 'confirmed' | 'cancelled' | 'neutral' }> = {
  menunggu_pembayaran: { label: 'Menunggu DP', tone: 'waiting' },
  dikonfirmasi: { label: 'Terkonfirmasi', tone: 'confirmed' },
  sedang_dilayani: { label: 'Sedang dilayani', tone: 'confirmed' },
  selesai: { label: 'Selesai', tone: 'neutral' },
  dibatalkan: { label: 'Dibatalkan', tone: 'cancelled' },
  tidak_hadir: { label: 'Tidak hadir', tone: 'cancelled' },
}

type Step = { name: 'phone' } | { name: 'code'; to: string; resendAt: number } | { name: 'result'; history: History }

/**
 * Riwayat booking per nomor WhatsApp: nomor, lalu kode OTP dari WhatsApp, lalu daftar booking (akan datang dan yang sudah lewat) dengan ringkasan
 * kunjungan. Hasilnya hanya disimpan di memori halaman ini (tidak di storage), supaya aman dipakai di perangkat bersama.
 */
export function HistoryView() {
  const router = useRouter()
  const [step, setStep] = useState<Step>({ name: 'phone' })
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Hitung mundur tombol kirim ulang.
  const resendAt = step.name === 'code' ? step.resendAt : 0
  useEffect(() => {
    if (step.name !== 'code') return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [step.name, resendAt])
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))

  const sendCode = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!isValidPhone(phone)) {
      setError('Nomor WhatsApp tidak valid. Contoh: 081234567890.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const sent = await api.requestOtp({ phone: phone.trim(), purpose: 'history' })
      setCode('')
      setStep({ name: 'code', to: sent.to, resendAt: Date.now() + sent.resendAfterSeconds * 1000 })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kode gagal dikirim. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const openHistory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (code.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      setStep({ name: 'result', history: await api.getHistory(phone.trim(), code) })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Riwayat gagal dimuat. Coba lagi.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setStep({ name: 'phone' })
    setCode('')
    setError(null)
  }

  if (step.name === 'result') {
    return <HistoryResult history={step.history} onClose={reset} onOpenTicket={(reservation) => {
      setCurrentReservation(reservation)
      router.push('/e-ticket')
    }} />
  }

  if (step.name === 'code') {
    return (
      <form onSubmit={openHistory} className="flex w-full max-w-md flex-col gap-5 surface-paper rounded-2xl p-6 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.7)] sm:p-8">
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MessageCircle className="size-5" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kalau nomor <span className="font-semibold text-foreground">{step.to}</span> pernah memesan, kami sudah mengirim kode 6 digit ke WhatsApp-nya. Masukkan kode itu untuk membuka riwayat.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Kode verifikasi
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            aria-invalid={error ? true : undefined}
            className="h-14 rounded-lg border border-input bg-background text-center font-display text-3xl tracking-[0.5em] text-foreground tabular-nums placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-background px-3.5 py-3 text-sm leading-relaxed">
            {error}
          </p>
        )}
        <Button type="submit" size="pill" disabled={code.length !== 6 || busy} className="w-full">
          {busy ? 'Memeriksa…' : 'Lihat Riwayat'}
        </Button>
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={waitSeconds > 0 || busy}
            className="text-accent underline underline-offset-4 hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {waitSeconds > 0 ? `Kirim ulang kode (${waitSeconds} dtk)` : 'Kirim ulang kode'}
          </button>
          <button type="button" onClick={reset} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Ganti nomor
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={sendCode} className="flex w-full max-w-md flex-col gap-5 surface-paper rounded-2xl p-6 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.7)] sm:p-8">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Nomor WhatsApp
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="081234567890"
          aria-describedby="riwayat-hint"
          className={inputClass}
        />
      </label>
      <p id="riwayat-hint" className="-mt-2 text-xs leading-relaxed text-muted-foreground">
        Pakai nomor yang kamu isi saat memesan. Kami kirim kode verifikasi ke WhatsApp nomor itu, jadi riwayatmu tidak bisa dibuka orang lain.
      </p>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-background px-3.5 py-3 text-sm leading-relaxed">
          {error}
        </p>
      )}
      <Button type="submit" size="pill" disabled={!isValidPhone(phone) || busy} className="w-full">
        {busy ? 'Mengirim kode…' : 'Kirim Kode ke WhatsApp'}
      </Button>
    </form>
  )
}

function HistoryResult({ history, onClose, onOpenTicket }: { history: History; onClose: () => void; onOpenTicket: (reservation: Reservation) => void }) {
  const upcoming = history.bookings.filter((item) => (item.status === 'menunggu_pembayaran' || item.status === 'dikonfirmasi') && !isReservationPast(item))
  const past = history.bookings.filter((item) => !upcoming.includes(item))
  const done = history.bookings.filter((item) => item.status === 'selesai')

  // Ringkasan dari booking yang benar-benar selesai.
  const latest = done[0]
  const favorite = Object.entries(
    done.reduce<Record<string, number>>((count, item) => ({ ...count, [item.barberName]: (count[item.barberName] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Riwayat booking</p>
          <h2 className="font-display text-3xl uppercase sm:text-4xl">{history.customerName ?? 'Pelanggan'}</h2>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Tutup riwayat
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {[
          ['Cukur selesai', `${done.length}×`],
          ['Terakhir', latest ? formatLongDate(fromIsoDate(latest.date)).replace(/^\w+, /, '') : '-'],
          ['Kapster langganan', favorite ?? '-'],
        ].map(([label, value]) => (
          <div key={label} className="surface-paper rounded-xl p-4">
            <dt className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
            <dd className="mt-1.5 font-display text-xl leading-tight sm:text-2xl">{value}</dd>
          </div>
        ))}
      </dl>

      {upcoming.length > 0 && <Section title="Akan datang" items={upcoming} onOpenTicket={onOpenTicket} />}
      <Section title="Riwayat" items={past} emptyText="Belum ada booking yang selesai atau terlewat." />
    </div>
  )
}

function Section({ title, items, emptyText, onOpenTicket }: { title: string; items: Reservation[]; emptyText?: string; onOpenTicket?: (reservation: Reservation) => void }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-3 font-display text-lg tracking-[0.04em] uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const date = fromIsoDate(item.date)
            const status = STATUS[item.status]
            return (
              <li key={item.code} className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 surface-paper rounded-xl p-4 sm:grid-cols-[auto_1fr_auto] sm:p-5">
                <div className="flex w-14 flex-col items-center justify-center rounded-lg border border-border bg-background py-2 text-center">
                  <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{date.toLocaleDateString('id-ID', { month: 'short' })}</span>
                  <span className="font-display text-2xl leading-none">{date.getDate()}</span>
                  <span className="text-[10px] text-muted-foreground">{date.getFullYear()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold">{item.serviceName}</p>
                  <p className="text-sm text-muted-foreground">
                    {date.toLocaleDateString('id-ID', { weekday: 'long' })}, {item.time.replace(':', '.')} · Kapster {item.barberName}
                  </p>
                  {item.hairstyle && <p className="mt-1 text-sm">Gaya: <span className="font-medium">{item.hairstyle}</span></p>}
                  <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                </div>
                <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                  <StatusChip tone={status.tone} onLight>{status.label}</StatusChip>
                  <p className="font-display text-lg tabular-nums">{formatRupiah(item.price)}</p>
                  {onOpenTicket && (
                    <button type="button" onClick={() => onOpenTicket(item)} className="text-sm whitespace-nowrap text-accent underline underline-offset-4 hover:text-foreground">
                      Buka e-tiket
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
