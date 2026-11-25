export type Haircut = {
  id: string
  name: string
  barberId: string
  /** Nama kapster yang mengerjakan. */
  barber: string
  category: string
  rating: number
  /** Path foto di folder public. */
  image: string
}
