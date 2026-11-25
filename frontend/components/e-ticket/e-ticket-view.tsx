'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { CancelConfirmation } from '@/components/e-ticket/cancel-confirmation'
import { DownloadButtons } from '@/components/e-ticket/download-buttons'
import { InvoiceStatus } from '@/components/e-ticket/invoice-status'
import { TicketCard } from '@/components/e-ticket/ticket-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { isReservationActive, isReservationCancelled, isReservationPast } from '@/lib/booking-rules'
import { downloadReservationIcs } from '@/lib/calendar'
import { loadReservation, setCurrentReservation } from '@/lib/reservation-storage'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/types/reservation'

export function ETicketView() {
  // undefined = belum dibaca dari storage; null = tidak ada reservasi tersimpan.
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined)
  useEffect(() => {
    const stored = loadReservation()
    setReservation(stored)
    if (!stored) return

    // Segarkan dari server: admin atau perangkat lain mungkin sudah mengubah atau membatalkan reservasi ini.
    // Kalau server tidak terjangkau, tiket tersimpan tetap ditampilkan.
    let cancelled = false
    api
      .lookupReservation(stored.code, stored.customerEmail)
      .then((fresh) => {
        if (cancelled) return
        setCurrentReservation(fresh)
        setReservation(fresh)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const confirmCancel = async (current: Reservation) => {
    setCancelling(true)
    setCancelError(null)
    try {
      const updated = await api.cancelReservation(current.code, current.customerEmail)
      setCurrentReservation(updated)
      setReservation(updated)
      setConfirmingCancel(false)
      window.scrollTo({ top: 0 })
    } catch (error) {
      setCancelError(error instanceof ApiError ? error.message : 'Reservasi gagal dibatalkan. Coba lagi.')
    } finally {
      setCancelling(false)
    }
  }

  if (reservation === undefined) return null

  if (reservation === null) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.025em] uppercase sm:text-5xl">Belum ada reservasi.</h1>
        <p className="max-w-[420px] text-muted-foreground">Buat reservasi dulu di halaman utama, lalu e-tiketmu akan muncul di sini.</p>
        <Link href="/#reservasi" className={buttonVariants({ size: 'pill' })}>
          Buat Reservasi
        </Link>
      </div>
    )
  }

  if (isReservationCancelled(reservation)) {
    return (
      <div className="flex w-full flex-col items-center gap-8">
        <span className="flex size-16 items-center justify-center rounded-full bg-destructive text-white">
          <X className="size-8" strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className="text-[13px] font-semibold tracking-[2.4px] text-destructive uppercase">Reservasi dibatalkan</p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-[-0.025em] text-balance text-foreground uppercase sm:text-6xl lg:text-[64px]">
            Slot sudah dilepas.
          </h1>
          <p className="max-w-[520px] leading-normal text-muted-foreground">
            Reservasi ini dibatalkan dan kodenya tidak berlaku lagi. Mau datang lain waktu? Buat reservasi baru kapan saja.
          </p>
        </div>
        <TicketCard reservation={reservation} cancelled />
        <div className="flex flex-wrap justify-center gap-3.5">
          <Link href="/#reservasi" className={buttonVariants({ size: 'pill' })}>
            Buat Reservasi Baru
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline-strong', size: 'pill' }), 'px-7')}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  const wasRescheduled = (reservation.rescheduleCount ?? 0) > 0
  const canCancel = isReservationActive(reservation) && !isReservationPast(reservation)

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <span className="flex size-16 items-center justify-center rounded-full bg-success text-white">
        <Check className="size-8" strokeWidth={3} aria-hidden="true" />
      </span>

      <div className="flex flex-col items-center gap-2.5 text-center">
        <p className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">{wasRescheduled ? 'Jadwal diperbarui' : 'Reservasi berhasil'}</p>
        <h1 className="font-display text-5xl leading-[1.05] tracking-[-0.025em] text-balance text-foreground uppercase sm:text-6xl lg:text-[64px]">
          {wasRescheduled ? 'Jadwal barumu tersimpan.' : 'Slot kamu sudah dikunci.'}
        </h1>
        <p className="max-w-[520px] leading-normal text-muted-foreground">
          {wasRescheduled
            ? 'Jadwal lama otomatis dibatalkan dan slotnya dibuka kembali. Tunjukkan kode yang sama ke kasir saat datang.'
            : 'Simpan kode ini atau unduh e-tiketnya, lalu tunjukkan ke kasir saat datang.'}
        </p>
      </div>

      <TicketCard reservation={reservation} />
      <InvoiceStatus invoice={reservation.invoice} />

      <div className="flex flex-wrap justify-center gap-3.5">
        <Button size="pill" onClick={() => downloadReservationIcs(reservation)}>
          Tambah ke Kalender
        </Button>
        <DownloadButtons reservation={reservation} />
        <Link href="/ubah-reservasi" className={cn(buttonVariants({ variant: 'outline-strong', size: 'pill' }), 'px-7')}>
          Ubah Jadwal
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: 'outline-strong', size: 'pill' }), 'px-7')}>
          Kembali ke Beranda
        </Link>
      </div>

      {canCancel &&
        (confirmingCancel ? (
          <CancelConfirmation onDismiss={() => setConfirmingCancel(false)} onConfirm={() => confirmCancel(reservation)} busy={cancelling} error={cancelError} />
        ) : (
          <button type="button" onClick={() => setConfirmingCancel(true)} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-destructive">
            Batalkan reservasi
          </button>
        ))}
    </div>
  )
}
