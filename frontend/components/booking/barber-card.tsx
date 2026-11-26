'use client'

import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BarberState } from '@/hooks/use-schedule-selection'

/** Libur dan penuh sama-sama "Tidak tersedia" bagi pelanggan; alasannya tidak penting untuk memilih. */
const STATE_LABEL: Record<BarberState, string> = { available: 'Tersedia', off: 'Tidak tersedia', busy: 'Tidak tersedia' }

type BarberCardProps = {
  name: string
  /** Alamat foto; null atau gagal dimuat = inisial di dalam frame. */
  photo: string | null
  state: BarberState
  selected: boolean
  onSelect: () => void
}

/** Sisir saku (garis tipis, seperti ikon alat di kaca barbershop). */
function Comb({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="44" height="8" rx="2" />
      <path d="M6 11v9M11 11v9M16 11v9M21 11v9M26 11v9M31 11v9M36 11v9M41 11v9" />
    </svg>
  )
}

/** Pisau cukur lipat. */
function Razor({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17c0-3 2-5 5-5h20l8-6c2-1.5 5 .5 3.500 3L34 17H8c-3 0-5 0-5 0Z" />
      <circle cx="9" cy="14.500" r="1.200" />
      <path d="M28 12l7 5" />
    </svg>
  )
}

/** Garis serong krem dan biru seperti tiang barbershop. */
const POLE = { backgroundImage: 'repeating-linear-gradient(135deg, #f3f1ea 0 7px, #3f6fe0 7px 14px)' } as const
/** Garis tipis diagonal samar sebagai tekstur latar. */
const TEXTURE = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 1.5px, transparent 1.5px 12px)' } as const

/**
 * Kartu kapster bernuansa barbershop: frame foto berbentuk kaca lengkung, tiang barber bergaris di tepi atas, garis potong
 * putus-putus dengan gunting, plakat nama krem, sisir dan pisau cukur, dan garis finish Pit Stop di dasar. Kapster yang libur
 * atau penuh di jam itu tampil redup dan tidak bisa dipilih. Tanpa foto, frame memuat inisial.
 */
export function BarberCard({ name, photo, state, selected, onSelect }: BarberCardProps) {
  const [failed, setFailed] = useState(false)
  const unavailable = state !== 'available'
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <button
      type="button"
      disabled={unavailable}
      aria-pressed={selected}
      aria-label={`${name}, ${STATE_LABEL[state]}`}
      onClick={onSelect}
      style={{ ...TEXTURE, containerType: 'inline-size' }}
      className={cn(
        'group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-background text-left ring-1 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        selected ? 'ring-2 ring-accent' : 'ring-foreground/15',
        unavailable ? 'cursor-not-allowed' : !selected && 'hover:ring-foreground/40',
      )}
    >
      {/* semua lapisan dekorasi dan foto; abu-abu saat kapster tidak tersedia (kartunya tetap tampil) */}
      <span aria-hidden="true" className={cn('absolute inset-0 transition-[filter,opacity] duration-200', unavailable && 'opacity-70 grayscale')}>
        {/* tiang barber di tepi atas */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-2.5" style={POLE} />

        {/* gunting besar samar di belakang frame */}
        <Scissors aria-hidden="true" className="pointer-events-none absolute top-[14%] left-1/2 size-[78%] -translate-x-1/2 -rotate-[28deg] text-white/[0.05]" strokeWidth={1} />

        {/* alat di sudut atas */}
        <Comb className="pointer-events-none absolute top-[7%] left-[6%] w-[17%] -rotate-12 text-white/35" />
        <Razor className="pointer-events-none absolute top-[7%] right-[6%] w-[17%] rotate-12 text-white/35" />

        {/* frame foto berbentuk kaca lengkung */}
        <span
          aria-hidden="true"
          className="absolute top-[13%] left-1/2 aspect-[4/5] w-[49%] -translate-x-1/2 overflow-hidden rounded-t-full rounded-b-xl bg-card ring-[3px] ring-foreground/90 ring-offset-[4px] ring-offset-accent"
        >
          {photo && !failed ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto dari backend (bisa data URL), tidak perlu optimasi next/image
            <img src={photo} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-end justify-center bg-foreground/[0.08] pb-[18%] font-serif text-[clamp(2rem,16cqw,3.5rem)] text-foreground/35">{initials}</span>
          )}
        </span>

        {/* garis potong putus-putus dengan gunting */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-[32%] flex items-center">
          <span className="ml-[5%] flex size-[9cqw] items-center justify-center rounded-full bg-accent text-white motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-rotate-12">
            <Scissors className="size-[5cqw] rotate-180" strokeWidth={2.2} />
          </span>
          <span className="mr-[5%] ml-1.5 h-0 flex-1 border-t-2 border-dashed border-white/40" />
        </span>

      </span>

      {/* plakat nama */}
      <span aria-hidden="true" className="absolute inset-x-[7%] bottom-[10%] flex items-center justify-between gap-2 rounded-md bg-foreground px-[5cqw] py-[2.2cqw] text-background">
        <span className={cn('min-w-0', unavailable && 'opacity-60')}>
          <span className="block truncate font-serif text-[clamp(0.95rem,7.5cqw,1.4rem)] leading-tight uppercase">{name}</span>
          <span className="block text-[clamp(0.55rem,3.2cqw,0.7rem)] font-semibold tracking-[0.18em] uppercase opacity-60">Kapster</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[clamp(0.55rem,3.2cqw,0.7rem)] font-semibold tracking-[0.1em] whitespace-nowrap uppercase">
          <span className={cn('size-2.5 rounded-full', state === 'available' ? 'bg-emerald-600' : 'bg-red-600')} />
          {STATE_LABEL[state]}
        </span>
      </span>

      {/* garis finish Pit Stop di dasar */}
      <span aria-hidden="true" className="checker-light absolute inset-x-0 bottom-0 h-3 opacity-90" style={{ backgroundSize: '12px 12px' }} />
    </button>
  )
}
