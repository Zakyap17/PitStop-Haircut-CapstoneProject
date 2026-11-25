export type HeroThemeId = 'dewasa' | 'anak'

/** Kotak-kotak finish yang melayang di latar jauh (pengganti daun di referensi). */
export const heroDiamonds = [
  { id: 'd1', top: '10%', left: '15%', size: 60, opacity: 0.35 },
  { id: 'd2', top: '40%', left: '80%', size: 140, opacity: 0.18 },
  { id: 'd3', top: '70%', left: '75%', size: 80, opacity: 0.3 },
  { id: 'd4', top: '85%', left: '20%', size: 120, opacity: 0.16 },
]

type HeroTheme = {
  id: HeroThemeId
  /** Nama cadangan kalau layanannya tidak ada di katalog. */
  fallbackLabel: string
  /** Id layanan di katalog; nama dan harga kartu diambil dari sana. */
  serviceId: string
  /** Foto yang muncul menyembul di kartu pilihan. */
  cardPhoto: string
  /** Warna gradien radial latar hero. */
  colors: { inner: string; mid: string; outer: string }
}

export const heroThemes: Record<HeroThemeId, HeroTheme> = {
  dewasa: {
    id: 'dewasa',
    fallbackLabel: 'Dewasa',
    serviceId: 'haircut-dewasa',
    cardPhoto: '/images/cuts/skin-fade.png',
    colors: { inner: '#0b6a78', mid: '#073a4e', outer: '#091c33' },
  },
  anak: {
    id: 'anak',
    fallbackLabel: 'Anak',
    serviceId: 'haircut-anak',
    cardPhoto: '/images/cuts/kids-undercut.png',
    colors: { inner: '#1a4fb8', mid: '#0b2f6b', outer: '#091c33' },
  },
}

export const heroThemeOrder: HeroThemeId[] = ['dewasa', 'anak']
