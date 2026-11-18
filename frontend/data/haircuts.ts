import type { Haircut } from '@/types/haircut'

export const haircuts: Haircut[] = [
  { name: 'Skin Fade', barber: 'Rizky', category: 'Dewasa', rating: 9.1, image: '/images/cuts/skin-fade.png' },
  { name: 'Pompadour', barber: 'Andi', category: 'Klasik', rating: 8.8, image: '/images/cuts/pompadour.png' },
  { name: 'Kids Undercut', barber: 'Bima', category: 'Anak', rating: 9.4, image: '/images/cuts/kids-undercut.png' },
  { name: 'French Crop', barber: 'Rizky', category: 'Dewasa', rating: 9.0, image: '/images/cuts/french-crop.png' },
  { name: 'Buzz & Beard', barber: 'Fajar', category: 'Grooming', rating: 8.7, image: '/images/cuts/buzz-and-beard.png' },
  { name: 'Two Block', barber: 'Andi', category: 'Korean', rating: 8.9, image: '/images/cuts/two-block.png' },
  { name: 'Modern Mullet', barber: 'Bima', category: 'Trend', rating: 8.6, image: '/images/cuts/modern-mullet.png' },
  { name: 'Low Taper Fade', barber: 'Rizky', category: 'Dewasa', rating: 9.2, image: '/images/cuts/low-taper-fade.png' },
  { name: 'Classic Side Part', barber: 'Andi', category: 'Klasik', rating: 8.9, image: '/images/cuts/classic-side-part.png' },
  { name: 'Kids Faux Hawk', barber: 'Bima', category: 'Anak', rating: 9.3, image: '/images/cuts/kids-faux-hawk.png' },
  { name: 'Textured Quiff', barber: 'Rizky', category: 'Trend', rating: 8.8, image: '/images/cuts/textured-quiff.png' },
  { name: 'Crew Cut', barber: 'Fajar', category: 'Grooming', rating: 8.5, image: '/images/cuts/crew-cut.png' },
  { name: 'Slick Back Undercut', barber: 'Andi', category: 'Klasik', rating: 9.0, image: '/images/cuts/slick-back-undercut.png' },
  { name: 'Kids Textured Crop', barber: 'Bima', category: 'Anak', rating: 9.1, image: '/images/cuts/kids-textured-crop.png' },
]

export const haircutCategories = ['Semua', ...Array.from(new Set(haircuts.map((haircut) => haircut.category)))]
