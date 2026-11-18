import type { AdminUser } from '@/types/admin'

/** Tanggal "hari ini" untuk data contoh admin. Ganti dengan tanggal asli saat terhubung ke backend. */
export const ADMIN_MOCK_DATE = {
  long: 'Selasa, 24 September 2024',
  eyebrow: '24 September 2024',
}

export const adminUser: AdminUser = {
  name: 'Andi R.',
  initials: 'AR',
  role: 'Admin / Kasir',
}

/** Jumlah booking yang perlu ditindaklanjuti, tampil sebagai badge di menu Booking. */
export const pendingBookingCount = 4

export const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: '/icons/admin/nav-dashboard.svg' },
  { label: 'Booking', href: '/admin/booking', icon: '/icons/admin/nav-booking.svg', badge: pendingBookingCount },
  { label: 'Transaksi', href: '/admin/transaksi', icon: '/icons/admin/nav-transaksi.svg' },
  { label: 'Jadwal', href: '/admin/jadwal', icon: '/icons/admin/nav-jadwal.svg' },
  { label: 'Layanan', href: '/admin/layanan', icon: '/icons/admin/nav-layanan.svg' },
  { label: 'Pelanggan', href: '/admin/pelanggan', icon: '/icons/admin/nav-pelanggan.svg' },
  { label: 'Laporan Harian', href: '/admin/laporan-harian', icon: '/icons/admin/nav-laporan-harian.svg' },
  { label: 'Pengaturan', href: '/admin/pengaturan', icon: '/icons/admin/nav-pengaturan.svg' },
] as const
