'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { TicketCard } from '@/components/e-ticket/ticket-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { downloadReservationIcs } from '@/lib/calendar'
import { loadReservation } from '@/lib/reservation-storage'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/types/reservation'

export function ETicketView() {
  // undefined = belum dibaca dari storage; null = tidak ada reservasi tersimpan.
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined)
  useEffect(() => setReservation(loadReservation()), [])

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

  const wasRescheduled = (reservation.rescheduleCount ?? 0) > 0

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
            : 'E-tiket sudah dikirim ke email kamu. Tunjukkan kode ini ke kasir saat datang.'}
        </p>
      </div>

      <TicketCard reservation={reservation} />

      <div className="flex flex-wrap justify-center gap-3.5">
        <Button size="pill" onClick={() => downloadReservationIcs(reservation)}>
          Tambah ke Kalender
        </Button>
        <Link href="/ubah-reservasi" className={cn(buttonVariants({ variant: 'outline-strong', size: 'pill' }), 'px-7')}>
          Ubah Jadwal
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: 'outline-strong', size: 'pill' }), 'px-7')}>
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
