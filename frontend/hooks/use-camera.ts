'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraStatus } from '@/types/try-on'

const ERROR_MESSAGES: Partial<Record<CameraStatus, string>> = {
  denied: 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, atau unggah foto wajah saja.',
  error: 'Kamera tidak bisa dinyalakan. Coba lagi, atau unggah foto wajah saja.',
}

/**
 * Mengelola kamera depan lewat getUserMedia. Video hanya diputar di browser, tidak pernah dikirim ke server.
 * Kamera otomatis dimatikan saat komponen ditutup atau tab disembunyikan.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [unsupportedReason, setUnsupportedReason] = useState('')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setUnsupportedReason('Kamera hanya bisa dipakai lewat HTTPS atau localhost. Unggah foto wajah saja.')
      setStatus('unsupported')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setUnsupportedReason('Browser atau perangkat ini tidak mendukung kamera. Unggah foto wajah saja.')
      setStatus('unsupported')
      return
    }

    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      setStatus('active')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setUnsupportedReason('Tidak ada kamera yang terdeteksi di perangkat ini. Unggah foto wajah saja.')
        setStatus('unsupported')
      } else {
        setStatus('error')
      }
    }
  }, [])

  // Elemen <video> baru ada setelah status 'active', jadi stream dipasang di sini.
  useEffect(() => {
    const video = videoRef.current
    if (status !== 'active' || !video || !streamRef.current) return
    video.srcObject = streamRef.current
    video.play().catch(() => {})
  }, [status])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && streamRef.current) stop()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [stop])

  /** Mengambil satu frame (dicerminkan seperti pratinjau) sebagai object URL gambar JPEG. */
  const capture = useCallback((): Promise<string | null> => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return Promise.resolve(null)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return Promise.resolve(null)
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/jpeg', 0.92)
    })
  }, [])

  const errorMessage = status === 'unsupported' ? unsupportedReason : (ERROR_MESSAGES[status] ?? null)

  return { videoRef, status, errorMessage, start, stop, capture }
}
