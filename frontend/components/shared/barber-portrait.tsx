'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type BarberPortraitProps = {
  name: string
  /** Alamat foto; null atau gagal dimuat = huruf pertama nama. */
  photo: string | null
  /** Kapster sedang tidak tersedia: foto diabukan. */
  dimmed?: boolean
  className?: string
}

/** Foto bulat kapster untuk kartu profil. Tanpa foto (atau fotonya gagal dimuat) menampilkan huruf pertama namanya. */
export function BarberPortrait({ name, photo, dimmed = false, className }: BarberPortraitProps) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-display text-3xl text-primary-foreground ring-2 ring-foreground/20 transition-[filter,opacity]',
        dimmed && 'opacity-70 grayscale',
        className,
      )}
    >
      {photo && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto dari backend (bisa data URL), tidak perlu optimasi next/image
        <img src={photo} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        name[0]?.toUpperCase()
      )}
    </span>
  )
}

/** Status kapster dengan bulatan: hijau "Tersedia" atau merah "Tidak tersedia". */
export function BarberStatus({ available, className }: { available: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span aria-hidden="true" className={cn('size-2.5 rounded-full', available ? 'bg-success' : 'bg-red-600')} />
      {available ? 'Tersedia' : 'Tidak tersedia'}
    </span>
  )
}
