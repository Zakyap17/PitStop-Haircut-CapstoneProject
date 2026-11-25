'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, ImagePlus, RotateCcw, Save } from 'lucide-react'
import { FacePanel } from '@/components/try-on/face-panel'
import { StylePanel } from '@/components/try-on/style-panel'
import { TemplateStrip } from '@/components/try-on/template-strip'
import { useCatalog } from '@/components/providers/catalog-provider'
import { useCamera } from '@/hooks/use-camera'
import { useTryOnChoice } from '@/hooks/use-try-on-choice'
import { clearTryOnChoice, saveTryOnChoice } from '@/lib/try-on-storage'
import { cn } from '@/lib/utils'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

const actionButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Studio Virtual Try-On: wajah pengguna (kamera/foto) berdampingan dengan referensi gaya rambut.
 * Semua diproses di browser; yang disimpan ke reservasi hanya nama gaya yang dipilih.
 */
export function TryOnStudio() {
  const { haircuts } = useCatalog()
  const camera = useCamera()
  const savedChoice = useTryOnChoice()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoUrlRef = useRef<string | null>(null)

  const haircut = haircuts[activeIndex]
  const cameraActive = camera.status === 'active'
  const isSaved = savedChoice?.name === haircut?.name

  const replacePhoto = (nextUrl: string | null) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    photoUrlRef.current = nextUrl
    setPhotoUrl(nextUrl)
  }

  // Bebaskan memori foto saat komponen ditutup.
  useEffect(
    () => () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    },
    [],
  )

  const startCamera = () => {
    setUploadError(null)
    replacePhoto(null)
    void camera.start()
  }

  const takeSnapshot = async () => {
    const url = await camera.capture()
    if (!url) return
    replacePhoto(url)
    camera.stop()
  }

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (JPG, PNG, atau WebP).')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setUploadError('Ukuran foto maksimal 10 MB.')
      return
    }
    setUploadError(null)
    camera.stop()
    replacePhoto(URL.createObjectURL(file))
  }

  const reset = () => {
    camera.stop()
    replacePhoto(null)
    setUploadError(null)
  }

  const go = (index: number) => setActiveIndex(Math.max(0, Math.min(haircuts.length - 1, index)))
  const message = uploadError ?? camera.errorMessage

  if (!haircut) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FacePanel videoRef={camera.videoRef} cameraActive={cameraActive} photoUrl={photoUrl} />
        <StylePanel haircut={haircut} onNext={() => go(activeIndex + 1)} onPrevious={() => go(activeIndex - 1)} />
      </div>

      {message && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-relaxed">
          {message}
        </p>
      )}

      <TemplateStrip haircuts={haircuts} activeIndex={activeIndex} onSelect={setActiveIndex} />

      <div className="flex flex-wrap gap-2">
        {cameraActive ? (
          <button type="button" onClick={takeSnapshot} className={cn(actionButton, 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}>
            <Camera className="size-4" aria-hidden="true" />
            Ambil foto
          </button>
        ) : (
          <button type="button" onClick={startCamera} disabled={camera.status === 'requesting'} className={actionButton}>
            <Camera className="size-4" aria-hidden="true" />
            {camera.status === 'requesting' ? 'Menyalakan…' : 'Nyalakan kamera'}
          </button>
        )}
        <button type="button" onClick={() => fileInputRef.current?.click()} className={actionButton}>
          <ImagePlus className="size-4" aria-hidden="true" />
          Unggah foto
        </button>
        {(cameraActive || photoUrl) && (
          <button type="button" onClick={reset} className={actionButton}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Ulangi
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="sr-only" tabIndex={-1} aria-label="Unggah foto wajah" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground" aria-live="polite">
          {isSaved ? (
            <>
              <span className="font-semibold text-foreground">{haircut.name}</span> tersimpan. Pilih jadwal di{' '}
              <a href="#reservasi" className="text-accent underline underline-offset-4">
                form reservasi
              </a>
              .
            </>
          ) : savedChoice ? (
            <>
              Gaya tersimpan saat ini: <span className="font-semibold text-foreground">{savedChoice.name}</span>.
            </>
          ) : (
            'Suka dengan gaya ini? Simpan, lalu lampirkan saat reservasi.'
          )}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => saveTryOnChoice({ name: haircut.name, barber: haircut.barber, category: haircut.category })}
            disabled={isSaved}
            className={cn(actionButton, !isSaved && 'border-accent bg-accent text-accent-foreground hover:bg-accent/90')}
          >
            {isSaved ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            {isSaved ? 'Tersimpan' : 'Simpan gaya ini'}
          </button>
          {savedChoice && (
            <button type="button" onClick={clearTryOnChoice} className="px-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Hapus
            </button>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Foto dan video hanya diproses di browser kamu dan tidak diunggah ke server. Yang disimpan ke reservasi hanya nama gaya rambut.
      </p>
    </div>
  )
}
