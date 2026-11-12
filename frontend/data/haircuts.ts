import type { Haircut, HaircutCategory } from '@/types/haircut'

export const haircuts: Haircut[] = [
  { name: 'Skin Fade', barberName: 'Rizky', category: 'Dewasa', rating: 9.2, imageSrc: '/images/cuts/skin-fade.png' },
  { name: 'Pompadour', barberName: 'Andi', category: 'Klasik', rating: 9.1, imageSrc: '/images/cuts/pompadour.png' },
  { name: 'Kids Undercut', barberName: 'Bima', category: 'Anak', rating: 9.0, imageSrc: '/images/cuts/kids-undercut.png' },
  { name: 'French Crop', barberName: 'Rizky', category: 'Dewasa', rating: 8.9, imageSrc: '/images/cuts/french-crop.png' },
  { name: 'Buzz & Beard', barberName: 'Fajar', category: 'Grooming', rating: 8.7, imageSrc: '/images/cuts/buzz-and-beard.png' },
  { name: 'Two Block', barberName: 'Andi', category: 'Korean Trend', rating: 8.9, imageSrc: '/images/cuts/two-block.png' },
  { name: 'Modern Mullet', barberName: 'Bima', category: 'Korean Trend', rating: 8.6, imageSrc: '/images/cuts/modern-mullet.png' },
  { name: 'Low Taper Fade', barberName: 'Rizky', category: 'Dewasa', rating: 9.2, imageSrc: '/images/cuts/low-taper-fade.png' },
  { name: 'Classic Side Part', barberName: 'Andi', category: 'Klasik', rating: 8.9, imageSrc: '/images/cuts/classic-side-part.png' },
  { name: 'Kids Faux Hawk', barberName: 'Bima', category: 'Anak', rating: 9.3, imageSrc: '/images/cuts/kids-faux-hawk.png' },
  { name: 'Textured Quiff', barberName: 'Rizky', category: 'Korean Trend', rating: 8.8, imageSrc: '/images/cuts/textured-quiff.png' },
  { name: 'Crew Cut', barberName: 'Fajar', category: 'Grooming', rating: 8.5, imageSrc: '/images/cuts/crew-cut.png' },
  { name: 'Slick Back Undercut', barberName: 'Andi', category: 'Klasik', rating: 9.0, imageSrc: '/images/cuts/slick-back-undercut.png' },
  { name: 'Kids Textured Crop', barberName: 'Bima', category: 'Anak', rating: 9.1, imageSrc: '/images/cuts/kids-textured-crop.png' },
]

export const ALL_CATEGORIES_LABEL = 'Semua'

export const haircutCategories: Array<typeof ALL_CATEGORIES_LABEL | HaircutCategory> = [
  ALL_CATEGORIES_LABEL,
  'Dewasa',
  'Klasik',
  'Anak',
  'Grooming',
  'Korean Trend',
]
