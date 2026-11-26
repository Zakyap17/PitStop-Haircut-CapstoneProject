'use client'

import Image from 'next/image'
import { Camera } from 'lucide-react'

type FacePanelProps = {
  /** Elemen video dari useCamera; tampil saat kamera aktif. */
  videoRef: React.RefObject<HTMLVideoElement | null>
  cameraActive: boolean
  /** Object URL foto (unggahan atau hasil jepretan). */
  photoUrl: string | null
}

/** Panel "Kamu": video kamera (dicerminkan) atau foto asli pengguna, atau petunjuk kosong. Hasil AI tampil di panel kanan. */
export function FacePanel({ videoRef, cameraActive, photoUrl }: FacePanelProps) {
  const hasFace = cameraActive || photoUrl !== null

  return (
    <figure className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/15">
      {cameraActive && <video ref={videoRef} muted playsInline aria-label="Pratinjau kamera" className="absolute inset-0 size-full -scale-x-100 object-cover" />}
      {!cameraActive && photoUrl && <Image src={photoUrl} alt="Foto wajahmu" fill unoptimized sizes="(min-width: 1024px) 18rem, 45vw" className="object-cover" />}
      {!hasFace && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-12 text-center text-muted-foreground">
          <Camera className="size-8" aria-hidden="true" />
          <p className="text-sm leading-relaxed">Nyalakan kamera atau unggah foto wajah</p>
        </div>
      )}
      {!photoUrl && <div aria-hidden="true" className="pointer-events-none absolute inset-6 rounded-[40%] border-2 border-dashed border-accent/70" />}
      <figcaption className="absolute top-3 left-3 rounded-full bg-background px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
        {cameraActive ? 'Kamera aktif' : photoUrl ? 'Fotomu' : 'Kamu'}
      </figcaption>
    </figure>
  )
}
