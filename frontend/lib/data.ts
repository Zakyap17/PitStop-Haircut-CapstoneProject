export type Cut = {
  name: string
  barber: string
  category: string
  rating: number
  image: string
}

export const cuts: Cut[] = [
  { name: 'Skin Fade', barber: 'Rizky', category: 'Dewasa', rating: 9.1, image: '/images/cuts/skin-fade.png' },
  { name: 'Pompadour', barber: 'Andi', category: 'Klasik', rating: 8.8, image: '/images/cuts/pompadour.png' },
  { name: 'Kids Undercut', barber: 'Bima', category: 'Anak', rating: 9.4, image: '/images/cuts/kids-cut.png' },
  { name: 'French Crop', barber: 'Rizky', category: 'Dewasa', rating: 9.0, image: '/images/cuts/crop.png' },
  { name: 'Buzz & Beard', barber: 'Fajar', category: 'Grooming', rating: 8.7, image: '/images/cuts/buzz.png' },
  { name: 'Two Block', barber: 'Andi', category: 'Korean', rating: 8.9, image: '/images/cuts/curtain.png' },
  { name: 'Modern Mullet', barber: 'Bima', category: 'Trend', rating: 8.6, image: '/images/cuts/mullet.png' },
  { name: 'Low Taper Fade', barber: 'Rizky', category: 'Dewasa', rating: 9.2, image: '/images/cuts/taper-fade.png' },
  { name: 'Classic Side Part', barber: 'Andi', category: 'Klasik', rating: 8.9, image: '/images/cuts/side-part.png' },
  { name: 'Kids Faux Hawk', barber: 'Bima', category: 'Anak', rating: 9.3, image: '/images/cuts/kids-hawk.png' },
  { name: 'Textured Quiff', barber: 'Rizky', category: 'Trend', rating: 8.8, image: '/images/cuts/quiff.png' },
  { name: 'Crew Cut', barber: 'Fajar', category: 'Grooming', rating: 8.5, image: '/images/cuts/crew-cut.png' },
  { name: 'Slick Back Undercut', barber: 'Andi', category: 'Klasik', rating: 9.0, image: '/images/cuts/slick-back.png' },
  { name: 'Kids Textured Crop', barber: 'Bima', category: 'Anak', rating: 9.1, image: '/images/cuts/kids-crop.png' },
]

export const cutCategories = ['Semua', ...Array.from(new Set(cuts.map((cut) => cut.category)))]

export type Service = {
  id: string
  name: string
  description: string
  price: number
  duration: number
}

export const services: Service[] = [
  { id: 'haircut', name: 'Haircut Dewasa', description: 'Konsultasi, potong, cuci, dan styling pomade.', price: 50000, duration: 45 },
  { id: 'kids', name: 'Haircut Anak', description: 'Potong di kursi mobil balap. Sabar, cepat, rapi.', price: 40000, duration: 30 },
  { id: 'fade', name: 'Premium Fade', description: 'Skin / taper fade detail dengan foil shaver.', price: 65000, duration: 60 },
  { id: 'beard', name: 'Shaving & Beard', description: 'Handuk hangat, pisau cukur, line-up jenggot.', price: 35000, duration: 30 },
  { id: 'color', name: 'Hair Coloring', description: 'Semir hitam, highlight, atau fashion color.', price: 120000, duration: 90 },
  { id: 'wash', name: 'Hair Spa & Wash', description: 'Keramas, pijat kepala, dan hair tonic.', price: 30000, duration: 20 },
]

export type Barber = {
  name: string
  role: string
  specialty: string
  experience: number
  offDays: number[]
}

export const barbers: Barber[] = [
  { name: 'Rizky', role: 'Head Kapster', specialty: 'Fade & Crop', experience: 8, offDays: [1] },
  { name: 'Andi', role: 'Senior Kapster', specialty: 'Klasik & Korean', experience: 6, offDays: [3] },
  { name: 'Bima', role: 'Kids Specialist', specialty: 'Potong Anak', experience: 4, offDays: [2] },
  { name: 'Fajar', role: 'Kapster', specialty: 'Beard & Shaving', experience: 3, offDays: [4] },
]

export const timeSlots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00']

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
