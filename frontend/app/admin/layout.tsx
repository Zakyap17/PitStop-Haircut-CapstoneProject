import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { InternalWorkspace } from '@/components/internal/internal-workspace'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'PitStop · Admin',
  description: 'Sistem operasional internal PitStop Barbershop.',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} admin-theme`}><InternalWorkspace allowed={['admin', 'owner']}>{children}</InternalWorkspace></div>
}
