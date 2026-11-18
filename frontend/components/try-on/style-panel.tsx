'use client'

import Image from 'next/image'
import { useRef } from 'react'
import type { Haircut } from '@/types/haircut'

const SWIPE_THRESHOLD_PX = 50

type StylePanelProps = {
  haircut: Haircut
  onNext: () => void
  onPrevious: () => void
}

/** Panel referensi gaya rambut. Geser ke kiri/kanan (atau drag) untuk ganti template. */
export function StylePanel({ haircut, onNext, onPrevious }: StylePanelProps) {
  const dragStartX = useRef<number | null>(null)

  return (
    <figure
      onPointerDown={(event) => {
        dragStartX.current = event.clientX
      }}
      onPointerUp={(event) => {
        if (dragStartX.current === null) return
        const deltaX = event.clientX - dragStartX.current
        dragStartX.current = null
        if (deltaX < -SWIPE_THRESHOLD_PX) onNext()
        if (deltaX > SWIPE_THRESHOLD_PX) onPrevious()
      }}
      onPointerCancel={() => {
        dragStartX.current = null
      }}
      className="relative aspect-[3/4] touch-pan-y overflow-hidden rounded-[1.5rem] bg-card select-none ring-1 ring-foreground/15"
    >
      <Image
        key={haircut.name}
        src={haircut.image}
        alt={`Contoh gaya rambut ${haircut.name}`}
        fill
        sizes="(min-width: 1024px) 18rem, 45vw"
        draggable={false}
        className="pointer-events-none object-cover"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-4 pt-12">
        <p className="font-serif text-2xl leading-none">{haircut.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Kapster {haircut.barber} · {haircut.category}
        </p>
      </figcaption>
      <span className="absolute top-3 left-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-accent-foreground uppercase">
        Referensi
      </span>
    </figure>
  )
}
