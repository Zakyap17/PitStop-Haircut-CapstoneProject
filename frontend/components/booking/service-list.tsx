'use client'

import { useRef } from 'react'
import { Check } from 'lucide-react'
import { useCatalog } from '@/components/providers/catalog-provider'
import { slotsNeeded } from '@/lib/booking-rules'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Service } from '@/types/service'

type ServiceListProps = {
  services: Service[]
  selectedId: string
  onSelect: (id: string) => void
}

/**
 * Pilihan layanan: satu kartu per layanan dengan tombol radio di kiri, jadi jelas bahwa pelanggan diminta memilih satu.
 * Layanan yang lebih dari satu slot diberi keterangan jumlah slotnya. Mengikuti pola radio: Tab masuk ke pilihan yang aktif,
 * panah berpindah pilihan.
 */
export function ServiceList({ services, selectedId, onSelect }: ServiceListProps) {
  const { booking } = useCatalog()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const move = (from: number, step: number) => {
    const next = (from + step + services.length) % services.length
    onSelect(services[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Pilih layanan" className="grid gap-3 sm:grid-cols-2">
      {services.map((service, index) => {
        const selected = service.id === selectedId
        const slots = slotsNeeded(service.durationMinutes, booking.timeSlots)
        return (
          <button
            key={service.id}
            ref={(element) => {
              refs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(service.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                event.preventDefault()
                move(index, 1)
              } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                event.preventDefault()
                move(index, -1)
              }
            }}
            className={cn(
              'flex items-start gap-3.5 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              selected ? 'border-accent bg-background ring-1 ring-accent' : 'border-border-strong hover:border-foreground/50',
            )}
          >
            <span
              aria-hidden="true"
              className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors', selected ? 'border-accent bg-accent text-accent-foreground' : 'border-foreground/40')}
            >
              {selected && <Check className="size-3" strokeWidth={3.5} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold">{service.name}</span>
              <span className={cn('block text-xs', selected ? 'text-foreground/80' : 'text-muted-foreground')}>
                {service.durationMinutes} menit{slots > 1 && ` · menahan ${slots} slot`}
              </span>
            </span>
            <span className={cn('shrink-0 font-display text-lg tracking-[0.02em] tabular-nums', selected && 'text-accent')}>{formatRupiah(service.price)}</span>
          </button>
        )
      })}
    </div>
  )
}
