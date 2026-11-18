'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Haircut } from '@/types/haircut'
import { cn } from '@/lib/utils'

type TemplateStripProps = {
  haircuts: Haircut[]
  activeIndex: number
  onSelect: (index: number) => void
}

/** Deretan thumbnail template gaya rambut dengan tombol panah. Panah kiri/kanan di keyboard juga berfungsi. */
export function TemplateStrip({ haircuts, activeIndex, onSelect }: TemplateStripProps) {
  const listRef = useRef<HTMLUListElement>(null)

  // Geser deretan (bukan halaman) agar thumbnail aktif selalu terlihat.
  useEffect(() => {
    const list = listRef.current
    const item = list?.children[activeIndex] as HTMLElement | undefined
    if (!list || !item) return
    list.scrollTo({ left: item.offsetLeft - (list.clientWidth - item.clientWidth) / 2, behavior: 'smooth' })
  }, [activeIndex])

  const go = (index: number) => onSelect(Math.max(0, Math.min(haircuts.length - 1, index)))

  return (
    <div
      role="group"
      aria-label="Pilih template gaya rambut"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(activeIndex - 1)
        if (event.key === 'ArrowRight') go(activeIndex + 1)
      }}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        onClick={() => go(activeIndex - 1)}
        disabled={activeIndex === 0}
        aria-label="Gaya sebelumnya"
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 transition-colors hover:bg-foreground/10 disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <ul ref={listRef} className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
        {haircuts.map((haircut, index) => (
          <li key={haircut.name} className="shrink-0 snap-center">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-pressed={index === activeIndex}
              aria-label={haircut.name}
              className={cn(
                'relative block size-14 overflow-hidden rounded-xl transition-all',
                index === activeIndex ? 'ring-2 ring-accent' : 'opacity-60 hover:opacity-100',
              )}
            >
              <Image src={haircut.image} alt="" fill sizes="56px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => go(activeIndex + 1)}
        disabled={activeIndex === haircuts.length - 1}
        aria-label="Gaya berikutnya"
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 transition-colors hover:bg-foreground/10 disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
