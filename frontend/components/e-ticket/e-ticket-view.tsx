'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CancelConfirmation } from '@/components/e-ticket/cancel-confirmation'
import { DownloadButtons } from '@/components/e-ticket/download-buttons'
import { DpPanel } from '@/components/e-ticket/dp-panel'
import { StatusChip } from '@/components/e-ticket/status-chip'
import { TicketCard } from '@/components/e-ticket/ticket-card'
import { WhatsappStatus } from '@/components/e-ticket/whatsapp-status'
import { Button, buttonVariants } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { isAwaitingDp, isReservationActive, isReservationCancelled, isReservationPast } from '@/lib/booking-rules'
import { downloadReservationIcs } from '@/lib/calendar'
import { loadReservation, setCurrentReservation } from '@/lib/reservation-storage'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/types/reservation'

const quietLink = 'text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground'

/** Judul halaman: penanda status, judul singkat, dan satu kalimat penjelas. Tiketnya sendiri yang jadi pusat perhatian. */
function PageHeader({ chip, title, text }: { chip: React.ReactNode; title: string; text: string }) {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      {chip}
      <h1 className="font-display text-4xl leading-[1.05] tracking-[0.01em] text-balance uppercase sm:text-5xl">{title}</h1>
      <p className="max-w-[480px] text-[15px] leading-relaxed text-muted-foreground">{text}</p>
    </header>
  )
}

export function ETicketView() {
  // undefined = belum dibaca dari storage; null = tidak ada booking tersimpan.
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined)
  useEffect(() => {
    const stored = loadReservation()
    setReservation(stored)
    if (!stored) return

    // Segarkan dari server: admin atau perangkat lain mungkin sudah mengubah atau membatalkan booking ini.
    // Kalau server tidak terjangkau, tiket tersimpan tetap ditampilkan.
    let cancelled = false
    api
      .lookupReservation(stored.code, stored.customerPhone)
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
      const updated = await api.cancelReservation(current.code, current.customerPhone)
      setCurrentReservation(updated)
      setReservation(updated)
      setConfirmingCancel(false)
      window.scrollTo({ top: 0 })
    } catch (error) {
      setCancelError(error instanceof ApiError ? error.message : 'Booking gagal dibatalkan. Coba lagi.')
    } finally {
      setCancelling(false)
    }
  }

  if (reservation === undefined) return null

  if (reservation === null) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-display text-4xl leading-[1.05] tracking-[0.01em] uppercase sm:text-5xl">Belum ada booking</h1>
        <p className="max-w-[420px] text-[15px] leading-relaxed text-muted-foreground">Buat booking dulu di halaman utama, lalu e-tiketmu akan muncul di sini.</p>
        <Link href="/#reservasi" className={buttonVariants({ size: 'pill' })}>
          Buat Booking
        </Link>
      </div>
    )
  }

  if (isReservationCancelled(reservation)) {
    return (
      <div className="flex w-full flex-col items-center gap-8">
        <PageHeader
          chip={<StatusChip tone="cancelled">Dibatalkan</StatusChip>}
          title="Booking dibatalkan"
          text="Slotmu sudah dilepas dan kode ini tidak berlaku lagi. Mau datang lain waktu? Buat booking baru kapan saja."
        />
        <TicketCard reservation={reservation} cancelled />
        <div className="flex flex-col items-center gap-4">
          <Link href="/#reservasi" className={buttonVariants({ size: 'pill' })}>
            Buat Booking Baru
          </Link>
          <Link href="/" className={quietLink}>
            Kembali ke beranda
          </Link>
        </div>
      </div>
    )
  }

  const wasRescheduled = reservation.rescheduleCount > 0
  const awaitingDp = isAwaitingDp(reservation)
  const past = isReservationPast(reservation)
  // Pelanggan hanya bisa membatalkan sendiri selama DP belum dibayar; setelahnya lewat kasir.
  const canCancel = awaitingDp && !past
  const confirmed = reservation.status === 'dikonfirmasi'
  const canReschedule = isReservationActive(reservation) && !past

  return (
    <div className="flex w-full flex-col items-center gap-8">
      {awaitingDp ? (
        <PageHeader
          chip={<StatusChip tone="waiting">Menunggu DP</StatusChip>}
          title="Satu langkah lagi"
          text="Slotmu ditahan sementara. Selesaikan DP sebelum batas waktu supaya bookingmu terkonfirmasi."
        />
      ) : confirmed ? (
        <PageHeader
          chip={<StatusChip tone="confirmed">{wasRescheduled ? 'Jadwal diperbarui' : 'Terkonfirmasi'}</StatusChip>}
          title="Tiketmu sudah siap"
          text="Simpan atau unduh e-tiket ini, lalu tunjukkan ke kasir saat datang."
        />
      ) : (
        <PageHeader chip={<StatusChip tone="neutral">Status booking</StatusChip>} title="Terima kasih" text="Booking ini sudah tidak aktif." />
      )}

      {awaitingDp && <DpPanel reservation={reservation} />}
      <TicketCard reservation={reservation} awaitingDp={awaitingDp} />
      <WhatsappStatus whatsapp={reservation.whatsapp} />

      <div className="flex w-full max-w-[880px] flex-col gap-3 sm:flex-row sm:justify-center">
        <DownloadButtons reservation={reservation} />
        <Button size="pill" variant="outline-strong" className="px-7" onClick={() => downloadReservationIcs(reservation)}>
          Tambah ke Kalender
        </Button>
      </div>

      {confirmingCancel && canCancel ? (
        <CancelConfirmation onDismiss={() => setConfirmingCancel(false)} onConfirm={() => confirmCancel(reservation)} busy={cancelling} error={cancelError} />
      ) : (
        <nav aria-label="Tindakan lain" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {canReschedule && (
            <Link href="/ubah-reservasi" className={quietLink}>
              Ubah jadwal
            </Link>
          )}
          <Link href="/" className={quietLink}>
            Kembali ke beranda
          </Link>
          {canCancel && (
            <button type="button" onClick={() => setConfirmingCancel(true)} className={cn(quietLink, 'hover:text-red-300')}>
              Batalkan booking
            </button>
          )}
        </nav>
      )}
      {confirmed && !past && <p className="max-w-[520px] text-center text-sm text-muted-foreground">DP sudah dibayar. Untuk membatalkan atau mengubah jadwal, hubungi kasir.</p>}
    </div>
  )
}
