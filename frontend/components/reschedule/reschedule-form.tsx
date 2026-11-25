'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarClock } from 'lucide-react'
import { ScheduleFields } from '@/components/booking/schedule-fields'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCatalog } from '@/components/providers/catalog-provider'
import { useScheduleSelection } from '@/hooks/use-schedule-selection'
import { api, ApiError } from '@/lib/api'
import { isReservationActive, isReservationPast } from '@/lib/booking-rules'
import { formatLongDate, fromIsoDate } from '@/lib/format'
import { loadReservation, setCurrentReservation } from '@/lib/reservation-storage'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/types/reservation'

function EmptyState({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.025em] uppercase sm:text-5xl">{title}</h1>
      <p className="max-w-[460px] text-muted-foreground">{text}</p>
      <Link href={href} className={buttonVariants({ size: 'pill' })}>
        {cta}
      </Link>
    </div>
  )
}

/** Form ubah jadwal: layanan dan data pelanggan tetap, hanya tanggal, jam, dan kapster yang bisa diganti. */
export function RescheduleForm() {
  const router = useRouter()
  const { booking } = useCatalog()
  const maxReschedules = booking.maxReschedules
  // undefined = belum dibaca dari storage; null = tidak ada reservasi aktif.
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined)
  useEffect(() => setReservation(loadReservation()), [])

  const schedule = useScheduleSelection(reservation?.serviceId ?? null)
  const { isoDate, time, barberId } = schedule
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (reservation === undefined) return null

  if (reservation === null) {
    return (
      <EmptyState
        title="Tidak ada reservasi."
        text="Buka reservasimu lewat Cek Reservasi dulu, lalu pilih Ubah Jadwal dari e-tiketnya."
        href="/cek-reservasi"
        cta="Cek Reservasi"
      />
    )
  }

  if (!isReservationActive(reservation)) {
    return (
      <EmptyState
        title={reservation.status === 'cancelled' ? 'Reservasi sudah dibatalkan.' : 'Reservasi sudah selesai.'}
        text="Reservasi ini tidak bisa diubah jadwalnya lagi. Buat reservasi baru untuk datang lagi."
        href="/#reservasi"
        cta="Buat Reservasi Baru"
      />
    )
  }

  if (isReservationPast(reservation)) {
    return (
      <EmptyState
        title="Jadwal sudah lewat."
        text="Reservasi yang jadwalnya sudah lewat tidak bisa diubah. Buat reservasi baru untuk datang lagi."
        href="/#reservasi"
        cta="Buat Reservasi Baru"
      />
    )
  }

  const changeCount = reservation.rescheduleCount ?? 0
  if (changeCount >= maxReschedules) {
    return (
      <EmptyState
        title="Batas ubah jadwal tercapai."
        text={`Jadwal satu reservasi hanya bisa diubah ${maxReschedules} kali. Hubungi kasir kalau kamu masih perlu mengubahnya.`}
        href="/e-ticket"
        cta="Kembali ke E-Tiket"
      />
    )
  }

  const isSameSchedule = isoDate === reservation.date && time === reservation.time && barberId === reservation.barberId
  const isValid = isoDate !== null && time !== null && barberId !== null && !isSameSchedule && !submitting

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || !isoDate || !time || !barberId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const updated = await api.rescheduleReservation(reservation.code, { email: reservation.customerEmail, barberId, date: isoDate, time })
      setCurrentReservation(updated)
      router.push('/e-ticket')
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null
      setSubmitError(apiError?.message ?? 'Jadwal gagal diubah. Coba lagi.')
      if (apiError && ['slot_taken', 'slot_unavailable', 'date_out_of_range', 'invalid_time'].includes(apiError.code)) schedule.reload()
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full min-w-0 max-w-2xl flex-col gap-7 rounded-3xl border border-foreground/10 bg-card/80 p-6 backdrop-blur sm:p-8"
    >
      <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4 text-sm">
        <p className="text-xs tracking-[1.6px] text-muted-foreground uppercase">Jadwal sekarang · {reservation.code}</p>
        <p className="mt-1.5 font-semibold">
          {formatLongDate(fromIsoDate(reservation.date))} · {reservation.time} · Kapster {reservation.barberName}
        </p>
        <p className="mt-1 text-muted-foreground">
          {reservation.serviceName} atas nama {reservation.customerName}. Sisa kesempatan ubah jadwal: {maxReschedules - changeCount} kali.
        </p>
      </div>

      <ScheduleFields schedule={schedule} dateLegend="1. Tanggal & jam baru" barberLegend="2. Kapster tersedia" />

      {isSameSchedule && <p className="text-sm text-muted-foreground">Pilih tanggal, jam, atau kapster yang berbeda dari jadwal sekarang.</p>}

      {submitError && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-relaxed">
          {submitError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-foreground/10 pt-6 sm:flex-row sm:justify-between">
        <Link href="/e-ticket" className={cn(buttonVariants({ variant: 'outline-strong', size: 'pill' }), 'px-7')}>
          Batal
        </Link>
        <Button type="submit" size="pill" disabled={!isValid}>
          <CalendarClock className="size-4" aria-hidden="true" />
          {submitting ? 'Menyimpan…' : 'Simpan Jadwal Baru'}
        </Button>
      </div>
    </form>
  )
}
