'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useCatalog } from '@/components/providers/catalog-provider'
import { haircutCategories } from '@/lib/catalog-utils'
import { cn } from '@/lib/utils'
import type { Haircut } from '@/types/haircut'

/** Galeri lengkap gaya rambut: filter kategori dan tampilan besar (dialog bawaan browser) saat foto dipilih. */
export function GalleryGrid() {
  const { haircuts } = useCatalog()
  const haircutCategoryList = haircutCategories(haircuts)
  const [category, setCategory] = useState('Semua')
  const [selected, setSelected] = useState<Haircut | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const visible = category === 'Semua' ? haircuts : haircuts.filter((haircut) => haircut.category === category)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (selected && !dialog.open) dialog.showModal()
    if (!selected && dialog.open) dialog.close()
  }, [selected])

  return (
    <div>
      <div role="group" aria-label="Filter kategori gaya" className="flex flex-wrap gap-2.5">
        {haircutCategoryList.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={cn(
              'rounded-full border px-5 py-2 text-sm font-medium tracking-wide transition-colors',
              category === item ? 'border-accent bg-accent text-accent-foreground' : 'border-foreground/15 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        Menampilkan {visible.length} gaya
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((haircut, index) => (
          <li key={haircut.name}>
            <button
              type="button"
              onClick={() => setSelected(haircut)}
              aria-label={`Lihat ${haircut.name}, kapster ${haircut.barber}`}
              className="group relative block w-full overflow-hidden rounded-2xl ring-1 ring-foreground/15 transition-transform hover:-translate-y-1"
            >
              <Image
                src={haircut.image}
                alt=""
                width={600}
                height={800}
                sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 47vw"
                loading={index < 4 ? 'eager' : 'lazy'}
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10 text-left">
                <span>
                  <span className="block font-display text-xl leading-none uppercase">{haircut.name}</span>
                  <span className="mt-1 block text-xs text-white/70">
                    {haircut.category} · {haircut.barber}
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={selected ? `${selected.name}, kapster ${selected.barber}` : 'Foto gaya rambut'}
        onClose={() => setSelected(null)}
        onClick={(event) => event.target === dialogRef.current && setSelected(null)}
        className="m-auto w-[min(92vw,460px)] overflow-hidden rounded-3xl border border-foreground/15 bg-card p-0 text-foreground backdrop:bg-black/80"
      >
        {selected && (
          <div className="relative">
            <Image
              src={selected.image}
              alt={`${selected.name}, dipotong oleh ${selected.barber}`}
              width={900}
              height={1200}
              sizes="460px"
              className="aspect-[3/4] max-h-[65svh] w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Tutup"
              className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <div className="flex flex-col gap-4 p-5">
              <div>
                <h2 className="font-display text-3xl uppercase">{selected.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.category} · Kapster {selected.barber}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/#try-on" className={buttonVariants({ size: 'pill', className: 'px-6 py-2.5' })}>
                  Coba di Try-On
                </Link>
                <Link href="/#reservasi" className={buttonVariants({ variant: 'outline-strong', size: 'pill', className: 'px-6 py-2.5' })}>
                  Reservasi
                </Link>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}
