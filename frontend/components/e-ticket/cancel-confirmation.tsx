'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

type CancelConfirmationProps = {
  onConfirm: () => void
  onDismiss: () => void
}

/** Konfirmasi pembatalan: pembatalan tidak bisa diurungkan, jadi pengguna harus menyetujui sekali lagi. */
export function CancelConfirmation({ onConfirm, onDismiss }: CancelConfirmationProps) {
  const keepButton = useRef<HTMLButtonElement>(null)

  // Fokus ke pilihan yang aman ("Tidak jadi") agar Enter tidak langsung membatalkan.
  useEffect(() => keepButton.current?.focus(), [])

  return (
    <div
      role="alertdialog"
      aria-labelledby="cancel-title"
      aria-describedby="cancel-text"
      onKeyDown={(event) => event.key === 'Escape' && onDismiss()}
      className="flex w-full max-w-[882px] flex-col gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <p id="cancel-title" className="text-lg font-semibold">
          Batalkan reservasi ini?
        </p>
        <p id="cancel-text" className="text-sm leading-relaxed text-muted-foreground">
          Slotmu dibuka kembali untuk pelanggan lain dan pembatalan tidak bisa diurungkan. Kalau masih ingin datang, kamu perlu membuat reservasi baru.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button ref={keepButton} type="button" variant="outline-strong" size="pill" onClick={onDismiss}>
          Tidak Jadi
        </Button>
        <Button type="button" size="pill" onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
          Ya, Batalkan
        </Button>
      </div>
    </div>
  )
}
