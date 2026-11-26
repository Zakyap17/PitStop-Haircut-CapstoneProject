'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Eye, ImagePlus, RotateCcw, Save, ScanFace, Sparkles } from 'lucide-react'
import { FacePanel } from '@/components/try-on/face-panel'
import { StylePanel } from '@/components/try-on/style-panel'
import { TemplateStrip } from '@/components/try-on/template-strip'
import { useCatalog } from '@/components/providers/catalog-provider'
import { useCamera } from '@/hooks/use-camera'
import { useTryOnChoice } from '@/hooks/use-try-on-choice'
import { api, ApiError } from '@/lib/api'
import { encodeImage, type EncodedImage } from '@/lib/image-encode'
import { clearTryOnChoice, saveTryOnChoice } from '@/lib/try-on-storage'
import { cn } from '@/lib/utils'
import type { FaceAnalysis } from '@/types/try-on'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

const actionButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-40'
const primaryButton = 'border-accent bg-accent text-accent-foreground hover:bg-accent/90'

/**
 * Studio Virtual Try-On berbasis AI. Alurnya:
 *  1. Pengguna mengambil atau mengunggah foto (panel kiri).
 *  2. AI menganalisa wajah dan memilih gaya dari galeri toko yang cocok.
 *  3. Baru setelah analisa selesai, panel kanan dan deretan gaya yang cocok muncul. Kalau pasang gaya di foto aktif (canGenerate),
 *     memilih gaya meminta AI memasangnya di foto; kalau tidak (mode analisa saja), panel kanan menampilkan referensi gaya yang cocok.
 * Yang disimpan ke booking hanya nama gaya yang dipilih.
 */
export function TryOnStudio() {
  const { haircuts } = useCatalog()
  const camera = useCamera()
  const savedChoice = useTryOnChoice()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // null = status belum diketahui. enabled = analisa wajah aktif; canGenerate = pasang gaya di foto juga aktif (berbayar).
  const [aiStatus, setAiStatus] = useState<{ enabled: boolean; canGenerate: boolean } | null>(null)
  const aiEnabled = aiStatus?.enabled ?? null
  const canGenerate = aiStatus?.canGenerate ?? false
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showReference, setShowReference] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoUrlRef = useRef<string | null>(null)
  // Naik setiap kali foto diganti, supaya hasil AI untuk foto lama yang baru selesai dibuang.
  const photoVersion = useRef(0)
  const encodedPhoto = useRef<{ version: number; image: EncodedImage } | null>(null)

  // Hanya gaya yang dipilih AI, sesuai urutan kecocokan. Kosong sampai analisa selesai.
  const recommended = analysis ? analysis.recommendedIds.map((id) => haircuts.find((item) => item.id === id)).filter((item) => item !== undefined) : []
  const activeIndex = Math.max(0, recommended.findIndex((item) => item.id === activeId))
  const haircut = recommended[activeIndex] ?? null
  const result = haircut ? (results[haircut.id] ?? null) : null
  const cameraActive = camera.status === 'active'
  const isSaved = haircut !== null && savedChoice?.name === haircut.name

  const replacePhoto = (nextUrl: string | null) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    photoUrlRef.current = nextUrl
    photoVersion.current += 1
    encodedPhoto.current = null
    setPhotoUrl(nextUrl)
    setAnalysis(null)
    setActiveId(null)
    setResults({})
    setShowReference(false)
    setAiError(null)
    setAnalyzing(false)
    setGenerating(false)
  }

  // Bebaskan memori foto saat komponen ditutup.
  useEffect(
    () => () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    },
    [],
  )

  useEffect(() => {
    let active = true
    api
      .getTryOnStatus()
      .then((status) => active && setAiStatus(status))
      .catch(() => active && setAiStatus({ enabled: false, canGenerate: false }))
    return () => {
      active = false
    }
  }, [])

  /** Foto pengguna yang sudah diperkecil; dipakai ulang oleh analisa dan setiap pembuatan gambar. */
  const getEncodedPhoto = async (url: string): Promise<EncodedImage> => {
    const cached = encodedPhoto.current
    if (cached && cached.version === photoVersion.current) return cached.image
    const image = await encodeImage(url, 1024)
    encodedPhoto.current = { version: photoVersion.current, image }
    return image
  }

  const generate = async (target: { id: string; name: string; image: string }) => {
    if (!photoUrl) return
    const version = photoVersion.current
    setGenerating(true)
    setAiError(null)
    setShowReference(false)
    try {
      const [photo, reference] = await Promise.all([getEncodedPhoto(photoUrl), encodeImage(target.image, 768)])
      const image = await api.generateTryOn({ photo, reference, haircutName: target.name })
      if (version !== photoVersion.current) return
      setResults((current) => ({ ...current, [target.id]: image }))
    } catch (error) {
      if (version !== photoVersion.current) return
      setAiError(error instanceof ApiError ? error.message : 'Gambar gagal dibuat. Coba lagi.')
    } finally {
      if (version === photoVersion.current) setGenerating(false)
    }
  }

  const analyze = async () => {
    if (!photoUrl || analyzing) return
    const version = photoVersion.current
    setAnalyzing(true)
    setAiError(null)
    try {
      const photo = await getEncodedPhoto(photoUrl)
      const found = await api.analyzeFace(photo)
      if (version !== photoVersion.current) return
      const first = haircuts.find((item) => item.id === found.recommendedIds[0])
      setAnalysis(found)
      setActiveId(first?.id ?? null)
      setAnalyzing(false)
      // Langsung pasang gaya yang paling cocok, supaya hasil pertama sudah terlihat tanpa menekan apa pun lagi.
      if (first && canGenerate) void generate(first)
    } catch (error) {
      if (version !== photoVersion.current) return
      setAiError(error instanceof ApiError ? error.message : 'Analisa gagal. Coba lagi.')
      setAnalyzing(false)
    }
  }

  const select = (index: number) => {
    const next = recommended[Math.max(0, Math.min(recommended.length - 1, index))]
    if (!next || next.id === activeId) return
    setActiveId(next.id)
    setShowReference(false)
    setAiError(null)
    // Gaya yang sudah pernah dibuat dipakai dari memori, tidak memanggil AI lagi.
    if (canGenerate && !results[next.id] && !generating) void generate(next)
  }

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

  const message = uploadError ?? camera.errorMessage ?? aiError

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FacePanel videoRef={camera.videoRef} cameraActive={cameraActive} photoUrl={photoUrl} />
        <StylePanel
          haircut={haircut}
          hasPhoto={photoUrl !== null}
          analyzing={analyzing}
          resultUrl={result}
          showReference={showReference}
          generating={generating}
          referenceOnly={!canGenerate}
          onNext={() => select(activeIndex + 1)}
          onPrevious={() => select(activeIndex - 1)}
        />
      </div>

      {message && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm leading-relaxed">
          {message}
        </p>
      )}

      {analysis && (
        <section aria-label="Hasil analisa AI" className="flex flex-col gap-1.5 rounded-2xl border border-border-strong bg-card p-4">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Hasil analisa AI</p>
          <p className="text-sm font-semibold">
            Bentuk wajah {analysis.faceShape || 'tidak terbaca'}
            {analysis.hairType ? ` · rambut ${analysis.hairType}` : ''}
          </p>
          {analysis.summary && <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>}
        </section>
      )}

      {/* Referensi gaya baru muncul setelah analisa AI selesai, dan hanya yang cocok untuk wajah pengguna. */}
      {analysis && recommended.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Gaya yang cocok untukmu</p>
          <TemplateStrip haircuts={recommended} activeIndex={activeIndex} onSelect={select} />
        </div>
      )}

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
        {photoUrl && aiEnabled && !analysis && (
          <button type="button" onClick={analyze} disabled={analyzing} className={cn(actionButton, primaryButton)}>
            <ScanFace className="size-4" aria-hidden="true" />
            {analyzing ? 'Menganalisa…' : 'Analisa wajahku dengan AI'}
          </button>
        )}
        {haircut && canGenerate && !generating && (
          <button type="button" onClick={() => void generate(haircut)} className={cn(actionButton, !result && primaryButton)}>
            <Sparkles className="size-4" aria-hidden="true" />
            {result ? 'Buat ulang' : 'Coba gaya ini'}
          </button>
        )}
        {result && !generating && (
          <button type="button" onClick={() => setShowReference((value) => !value)} aria-pressed={showReference} className={actionButton}>
            <Eye className="size-4" aria-hidden="true" />
            {showReference ? 'Lihat hasil AI' : 'Lihat referensi'}
          </button>
        )}
        {(cameraActive || photoUrl) && (
          <button type="button" onClick={reset} className={actionButton}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Ulangi
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="sr-only" tabIndex={-1} aria-label="Unggah foto wajah" />
      </div>

      {aiEnabled === false && <p className="text-xs leading-relaxed text-muted-foreground">Analisa wajah dengan AI belum diaktifkan.</p>}

      {haircut && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
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
              'Suka dengan gaya ini? Simpan, lalu lampirkan saat booking.'
            )}
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => saveTryOnChoice({ name: haircut.name, barber: haircut.barber, category: haircut.category })}
              disabled={isSaved}
              className={cn(actionButton, !isSaved && primaryButton)}
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
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {canGenerate ? 'Foto yang kamu pakai dikirim ke layanan AI hanya untuk analisa dan membuat gambar hasil' : 'Foto yang kamu pakai dikirim ke layanan AI hanya untuk analisa wajah'}, dan tidak disimpan di server kami. Yang tersimpan di booking
        hanya nama gaya rambut. Rekomendasi AI adalah perkiraan, hasil akhir bergantung pada jenis rambutmu dan penilaian kapster.
      </p>
    </div>
  )
}
