/** Warna status pada badge admin. */
export type StatusTone = 'success' | 'warning' | 'neutral'

export type ScheduleStatus = 'confirmed' | 'waiting-service' | 'waiting-confirmation'

export type ScheduleItem = {
  time: string
  customer: string
  service: string
  capster: string
  status: ScheduleStatus
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer Bank'

export type TransactionSource = 'Walk-in' | 'Booking'

export type TransactionStatus = 'paid'

export type Transaction = {
  id: string
  time: string
  customer: string
  source: TransactionSource
  service: string
  capster: string
  /** Total dalam Rupiah. */
  total: number
  method: PaymentMethod
  status: TransactionStatus
}

export type DashboardMetric = {
  label: string
  value: string
  caption: string
}

export type AdminUser = {
  name: string
  initials: string
  role: string
}
