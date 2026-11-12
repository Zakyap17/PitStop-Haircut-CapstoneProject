import type { Service } from '@/types/service'

export const services: Service[] = [
  { id: 'haircut-dewasa', name: 'Haircut Dewasa', durationMinutes: 45, price: 50000 },
  { id: 'haircut-anak', name: 'Haircut Anak', durationMinutes: 30, price: 40000 },
  { id: 'premium-fade', name: 'Premium Fade', durationMinutes: 60, price: 65000 },
  { id: 'shaving-beard', name: 'Shaving & Beard', durationMinutes: 30, price: 35000 },
  { id: 'hair-coloring', name: 'Hair Coloring', durationMinutes: 90, price: 120000 },
  { id: 'hair-spa-wash', name: 'Hair Spa & Wash', durationMinutes: 20, price: 30000 },
]
