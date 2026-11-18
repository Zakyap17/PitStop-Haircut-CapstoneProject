import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AdminMobileNav, AdminSidebar } from '@/components/admin/shell/admin-sidebar'
import { AdminTopbar } from '@/components/admin/shell/admin-topbar'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Pit Stop Admin',
  description: 'Dashboard admin Pit Stop Barbershop: booking, transaksi, jadwal, dan laporan harian.',
  robots: { index: false, follow: false },
}

/** Kerangka halaman admin: sidebar kiri + area utama. Tema terang diatur oleh kelas `admin-theme`. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} admin-theme flex min-h-svh flex-col lg:flex-row`}>
      <AdminSidebar />
      <AdminMobileNav />
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-6 pb-10 sm:px-8">
        <AdminTopbar />
        {children}
      </div>
    </div>
  )
}
