import { cache } from 'react'
import type { Catalog } from '@/types/catalog'

/** Alamat backend untuk panggilan dari server Next. Browser memakai /api/... yang diteruskan ke sini. */
export const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:4000').replace(/\/$/, '')

/**
 * Mengambil katalog (layanan, kapster, gaya rambut, testimoni, aturan reservasi) dari backend.
 * Di-cache 30 detik di sisi Next, dan `cache()` memastikan satu permintaan halaman hanya memanggil backend sekali
 * walau banyak komponen memintanya. Gagal = error, sehingga halaman error (app/error.tsx) yang tampil.
 */
export const getCatalog = cache(async (): Promise<Catalog> => {
  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/api/catalog`, { next: { revalidate: 30 } })
  } catch {
    throw new Error(`Backend tidak bisa dihubungi di ${BACKEND_URL}. Pastikan server backend berjalan.`)
  }
  if (!response.ok) throw new Error(`Backend membalas ${response.status} saat mengambil katalog.`)
  return (await response.json()) as Catalog
})
