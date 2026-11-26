'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import type { Haircut } from '@/types/haircut'

const SWIPE_THRESHOLD_PX = 50

type StylePanelProps = {
  /** Gaya terpilih dari hasil analisa AI; null = analisa belum selesai (panel masih kosong). */
  haircut: Haircut | null
  /** Pengguna sudah punya foto. */
  hasPhoto: boolean
  /** AI sedang menganalisa wajah. */
  analyzing: boolean
  /** Foto pengguna dengan gaya ini dari AI (data URL); null = belum dibuat. */
  resultUrl: string | null
  /** Tampilkan referensi gaya walaupun hasil AI sudah ada. */
  showReference: boolean
  /** AI sedang membuat gambar. */
  generating: boolean
  /** Mode analisa saja: panel menampilkan referensi gaya yang cocok, bukan hasil AI. */
  referenceOnly?: boolean
  onNext: () => void
  onPrevious: () => void
}

/**
 * Panel kanan: wajah pengguna dengan gaya yang dipilih (hasil AI). Sebelum AI dijalankan menampilkan foto referensi gayanya.
 * Geser ke kiri/kanan (atau drag) untuk ganti gaya.
 */
export function StylePanel({ haircut, hasPhoto, analyzing, resultUrl, showReference, generating, referenceOnly = false, onNext, onPrevious }: StylePanelProps) {
  const dragStartX = useRef<number | null>(null)
  const showingResult = resultUrl !== null && !showReference

  // Sebelum analisa AI selesai tidak ada gaya apa pun yang ditampilkan, hanya keterangan.
  if (!haircut) {
    return (
      <figure className="relative flex aspect-[3/4] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.5rem] bg-card px-8 text-center text-muted-foreground ring-1 ring-foreground/15">
        {analyzing ? <Loader2 className="size-8 animate-spin text-accent" aria-hidden="true" /> : <Sparkles className="size-8" aria-hidden="true" />}
        <p role={analyzing ? 'status' : undefined} className="text-sm leading-relaxed">
          {analyzing ? 'AI sedang menganalisa wajahmu. Biasanya 5 sampai 15 detik.' : hasPhoto ? 'Tekan "Analisa wajahku dengan AI" untuk melihat gaya yang cocok.' : 'Gaya yang cocok untuk wajahmu muncul di sini setelah kamu mengunggah foto dan AI selesai menganalisa.'}
        </p>
      </figure>
    )
  }

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
      {showingResult ? (
        <Image key={`${haircut.id}-hasil`} src={resultUrl} alt={`Wajahmu dengan gaya ${haircut.name} (hasil AI)`} fill unoptimized sizes="(min-width: 1024px) 18rem, 45vw" draggable={false} className="pointer-events-none object-cover" />
      ) : (
        <Image key={haircut.name} src={haircut.image} alt={`Contoh gaya rambut ${haircut.name}`} fill sizes="(min-width: 1024px) 18rem, 45vw" draggable={false} className="pointer-events-none object-cover" />
      )}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-4 pt-12">
        <p className="font-serif text-2xl leading-none">{haircut.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Kapster {haircut.barber} · {haircut.category}
        </p>
      </figcaption>
      <span className="absolute top-3 left-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-accent-foreground uppercase">
        {showingResult ? 'Hasil AI' : referenceOnly ? 'Cocok untukmu' : 'Referensi'}
      </span>
      {showingResult && (
        <div className="absolute top-3 right-3 size-14 overflow-hidden rounded-xl ring-2 ring-background">
          <Image src={haircut.image} alt={`Referensi ${haircut.name}`} fill sizes="56px" draggable={false} className="pointer-events-none object-cover" />
        </div>
      )}
      {generating && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 px-8 text-center">
          <Loader2 className="size-8 animate-spin text-accent" aria-hidden="true" />
          <p className="text-sm leading-relaxed">AI sedang memasang gaya rambut. Biasanya 10 sampai 40 detik.</p>
        </div>
      )}
    </figure>
  )
}
