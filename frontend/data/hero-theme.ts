import { services } from '@/data/services'

export type HeroThemeId = 'dewasa' | 'anak'

/** Isi satu elemen melayang: foto gaya rambut bulat atau bola kotak-kotak ala ban balap. */
export type HeroItemContent = { type: 'photo'; src: string; alt: string } | { type: 'checker' }

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
  { id: 'b1', layer: 'fg', top: '25%', left: '33%', size: 220, opacity: 1 },
  { id: 'b2', layer: 'fg', top: '60%', left: '42%', size: 100, opacity: 1 },
  { id: 'b3', layer: 'fg', top: '34%', left: '56%', size: 250, opacity: 1 },
  { id: 'b4', layer: 'fg', top: '15%', left: '48%', size: 140, opacity: 1 },
  { id: 'b5', layer: 'fg', top: '70%', left: '28%', size: 120, opacity: 1 },
  { id: 'b6', layer: 'fg', top: '45%', left: '75%', size: 180, opacity: 1 },
  { id: 'b7', layer: 'bg', top: '15%', left: '40%', size: 80, opacity: 0.7 },
  { id: 'b8', layer: 'bg', top: '50%', left: '55%', size: 70, opacity: 0.6 },
  { id: 'b9', layer: 'bg', top: '80%', left: '35%', size: 75, opacity: 0.7 },
]

/** Kotak-kotak finish yang melayang di latar jauh (pengganti daun di referensi). */
export const heroDiamonds = [
  { id: 'd1', top: '10%', left: '15%', size: 60, opacity: 0.35 },
  { id: 'd2', top: '40%', left: '80%', size: 140, opacity: 0.18 },
  { id: 'd3', top: '70%', left: '75%', size: 80, opacity: 0.3 },
  { id: 'd4', top: '85%', left: '20%', size: 120, opacity: 0.16 },
]

const photo = (file: string, alt: string): HeroItemContent => ({ type: 'photo', src: `/images/cuts/${file}.png`, alt })
const checker: HeroItemContent = { type: 'checker' }

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
    items: {
      b1: photo('skin-fade', 'Gaya Skin Fade'),
      b2: photo('french-crop', 'Gaya French Crop'),
      b3: photo('low-taper-fade', 'Gaya Low Taper Fade'),
      b4: photo('pompadour', 'Gaya Pompadour'),
      b5: photo('classic-side-part', 'Gaya Classic Side Part'),
      b6: photo('slick-back-undercut', 'Gaya Slick Back Undercut'),
      b7: photo('textured-quiff', 'Gaya Textured Quiff'),
      b8: photo('crew-cut', 'Gaya Crew Cut'),
      b9: photo('two-block', 'Gaya Two Block'),
    },
  },
  anak: {
    id: 'anak',
    label: services[1].name,
    price: services[1].price,
    cardPhoto: '/images/cuts/kids-undercut.png',
    colors: { inner: '#1a4fb8', mid: '#0b2f6b', outer: '#091c33' },
    items: {
      b1: photo('kids-undercut', 'Gaya Kids Undercut'),
      b2: checker,
      b3: photo('kids-faux-hawk', 'Gaya Kids Faux Hawk'),
      b4: checker,
      b5: checker,
      b6: photo('kids-textured-crop', 'Gaya Kids Textured Crop'),
      b7: checker,
      b8: checker,
      b9: checker,
    },
  },
}

export const heroThemeOrder: HeroThemeId[] = ['dewasa', 'anak']
