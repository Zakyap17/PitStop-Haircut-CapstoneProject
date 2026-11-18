import type { ScheduleStatus, StatusTone, TransactionStatus } from '@/types/admin'

type StatusMeta = { label: string; tone: StatusTone }

export const scheduleStatusMeta: Record<ScheduleStatus, StatusMeta> = {
  confirmed: { label: 'Terkonfirmasi', tone: 'success' },
  'waiting-service': { label: 'Menunggu Layanan', tone: 'warning' },
  'waiting-confirmation': { label: 'Menunggu Konfirmasi', tone: 'neutral' },
}

export const transactionStatusMeta: Record<TransactionStatus, StatusMeta> = {
  paid: { label: 'Dibayar', tone: 'success' },
}
