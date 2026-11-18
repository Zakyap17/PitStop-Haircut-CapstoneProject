import type { DashboardMetric, ScheduleItem, Transaction } from '@/types/admin'

export const dashboardMetrics: DashboardMetric[] = [
  { label: 'Pendapatan Hari Ini', value: 'Rp150.000', caption: 'Transaksi dibayar' },
  { label: 'Jumlah Transaksi', value: '4', caption: 'Semua sumber' },
  { label: 'Layanan Selesai', value: '4', caption: 'Hari ini' },
  { label: 'Booking Hari Ini', value: '4', caption: '2 dari website' },
  { label: 'Menunggu Konfirmasi', value: '1', caption: 'Perlu ditindaklanjuti' },
]

export const todaySchedule: ScheduleItem[] = [
  { time: '09:00', customer: 'Fajar Nugraha', service: 'Classic Haircut', capster: 'Raka Pratama', status: 'confirmed' },
  { time: '10:30', customer: 'Kevin Wijaya', service: 'Haircut & Beard', capster: 'Dimas Saputra', status: 'waiting-service' },
  { time: '13:00', customer: 'Aditya Rahman', service: 'Classic Haircut', capster: 'Raka Pratama', status: 'waiting-confirmation' },
  { time: '15:30', customer: 'Bima Putra', service: 'Kids Haircut', capster: 'Dimas Saputra', status: 'waiting-service' },
]

export const recentTransactions: Transaction[] = [
  { id: 'TRX-0924-001', time: '08:42', customer: 'Andi Setiawan', source: 'Walk-in', service: 'Classic Haircut', capster: 'Raka Pratama', total: 35000, method: 'Tunai', status: 'paid' },
  { id: 'TRX-0924-002', time: '09:15', customer: 'Siti Aminah', source: 'Walk-in', service: 'Haircut & Beard', capster: 'Dimas Saputra', total: 50000, method: 'QRIS', status: 'paid' },
  { id: 'TRX-0924-003', time: '10:02', customer: 'Rian Hidayat', source: 'Booking', service: 'Classic Haircut', capster: 'Raka Pratama', total: 35000, method: 'Tunai', status: 'paid' },
  { id: 'TRX-0924-004', time: '10:25', customer: 'Maya Lestari', source: 'Walk-in', service: 'Kids Haircut', capster: 'Dimas Saputra', total: 30000, method: 'Transfer Bank', status: 'paid' },
]

export const operationSummary = [
  { label: 'Layanan selesai', value: 'Raka 2 · Dimas 2' },
  { label: 'Booking berikutnya', value: 'Kevin Wijaya, 10:30' },
  { label: 'Status kasir', value: 'Semua transaksi sinkron' },
]
