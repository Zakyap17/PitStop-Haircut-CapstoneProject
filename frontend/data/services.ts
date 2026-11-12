import type { Service } from '@/types/service'

export const services: Service[] = [
  { id: 'haircut-dewasa', name: 'Haircut Dewasa', description: 'Konsultasi, potong, cuci, dan styling pomade.', price: 50000, durationMinutes: 45 },
  { id: 'haircut-anak', name: 'Haircut Anak', description: 'Potong di kursi mobil balap. Sabar, cepat, rapi.', price: 40000, durationMinutes: 30 },
  { id: 'premium-fade', name: 'Premium Fade', description: 'Skin / taper fade detail dengan foil shaver.', price: 65000, durationMinutes: 60 },
  { id: 'shaving-beard', name: 'Shaving & Beard', description: 'Handuk hangat, pisau cukur, line-up jenggot.', price: 35000, durationMinutes: 30 },
  { id: 'hair-coloring', name: 'Hair Coloring', description: 'Semir hitam, highlight, atau fashion color.', price: 120000, durationMinutes: 90 },
  { id: 'hair-spa-wash', name: 'Hair Spa & Wash', description: 'Keramas, pijat kepala, dan hair tonic.', price: 30000, durationMinutes: 20 },
]
