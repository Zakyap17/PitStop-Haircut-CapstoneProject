export type Haircut = {
  name: string
  /** Nama kapster yang mengerjakan. */
  barber: string
  category: string
  rating: number
  /** Path foto di folder public. */
  image: string
}
