export type HaircutCategory = 'Dewasa' | 'Klasik' | 'Anak' | 'Grooming' | 'Korean Trend'

export type Haircut = {
  name: string
  barberName: string
  category: HaircutCategory
  rating: number
  imageSrc: string
}
