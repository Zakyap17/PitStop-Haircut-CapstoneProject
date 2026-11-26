'use client'

import { useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canShareImages, downloadReservationImage, shareReservationImage } from '@/lib/ticket-image'
import type { Reservation } from '@/types/reservation'

/** Tombol Unduh (gambar PNG) dan Bagikan (hanya di perangkat yang mendukung menu bagikan). */
export function DownloadButtons({ reservation }: { reservation: Reservation }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [canShare, setCanShare] = useState(false)
  useEffect(() => setCanShare(canShareImages()), [])

  const run = async (action: (reservation: Reservation) => Promise<void>) => {
    setBusy(true)
    setFailed(false)
    try {
      await action(reservation)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="pill" className="px-7" disabled={busy} onClick={() => run(downloadReservationImage)}>
        <Download className="size-4" aria-hidden="true" />
        Unduh E-Tiket
      </Button>
      {canShare && (
        <Button size="pill" variant="outline-strong" className="px-7" disabled={busy} onClick={() => run(shareReservationImage)}>
          <Share2 className="size-4" aria-hidden="true" />
          Bagikan
        </Button>
      )}
      {failed && (
        <p role="alert" className="w-full text-center text-sm text-destructive">
          Gambar e-tiket gagal dibuat. Coba lagi, atau catat kode bookingmu.
        </p>
      )}
    </>
  )
}
