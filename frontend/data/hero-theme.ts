import { services } from '@/data/services'

export type HeroThemeId = 'dewasa' | 'anak'

/** Isi satu elemen melayang: bola kotak-kotak ala ban balap. Warna keduanya mengikuti tema. */
export type HeroItemContent = { color: string }

/** Posisi dan ukuran tiap elemen melayang. Posisi dalam persen dari area hero, ukuran dalam piksel. */
export type HeroSlot = {
  id: string
  /** `fg` melayang di atas teks, `bg` di belakang logo. */
  layer: 'fg' | 'bg'
  top: string
  left: string
  size: number
  /** Transparansi dasar (elemen latar dibuat samar). */
  opacity: number
}

export const heroSlots: HeroSlot[] = [
  { id: 'b1', layer: 'fg', top: '25%', left: '33%', size: 90, opacity: 1 },
  { id: 'b2', layer: 'fg', top: '62%', left: '42%', size: 60, opacity: 1 },
  { id: 'b3', layer: 'fg', top: '34%', left: '58%', size: 120, opacity: 1 },
  { id: 'b4', layer: 'fg', top: '14%', left: '48%', size: 64, opacity: 1 },
  { id: 'b5', layer: 'fg', top: '70%', left: '28%', size: 80, opacity: 1 },
  { id: 'b6', layer: 'bg', top: '48%', left: '70%', size: 56, opacity: 0.6 },
]

/** Kotak-kotak finish yang melayang di latar jauh (pengganti daun di referensi). */
export const heroDiamonds = [
  { id: 'd1', top: '10%', left: '15%', size: 60, opacity: 0.35 },
  { id: 'd2', top: '40%', left: '80%', size: 140, opacity: 0.18 },
  { id: 'd3', top: '70%', left: '75%', size: 80, opacity: 0.3 },
  { id: 'd4', top: '85%', left: '20%', size: 120, opacity: 0.16 },
]

/** Semua elemen melayang memakai warna tema yang sama. */
const itemsOf = (color: string): Record<string, HeroItemContent> => Object.fromEntries(heroSlots.map((slot) => [slot.id, { color }]))

type HeroTheme = {
  id: HeroThemeId
  label: string
  price: number
  /** Foto yang muncul menyembul di kartu pilihan. */
  cardPhoto: string
  /** Warna gradien radial latar hero. */
  colors: { inner: string; mid: string; outer: string }
  items: Record<string, HeroItemContent>
}

export const heroThemes: Record<HeroThemeId, HeroTheme> = {
  dewasa: {
    id: 'dewasa',
    label: services[0].name,
    price: services[0].price,
    cardPhoto: '/images/cuts/skin-fade.png',
    colors: { inner: '#0b6a78', mid: '#073a4e', outer: '#091c33' },
    items: itemsOf('#0f8a99'),
  },
  anak: {
    id: 'anak',
    label: services[1].name,
    price: services[1].price,
    cardPhoto: '/images/cuts/kids-undercut.png',
    colors: { inner: '#1a4fb8', mid: '#0b2f6b', outer: '#091c33' },
    items: itemsOf('#1f4bff'),
  },
}

export const heroThemeOrder: HeroThemeId[] = ['dewasa', 'anak']
