import type { Metadata } from 'next'
import { InternalWorkspace } from '@/components/internal/internal-workspace'

export const metadata: Metadata = { title: 'PitStop · Capster', robots: { index: false, follow: false } }
export default function CapsterLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-theme"><InternalWorkspace allowed={['capster']}>{children}</InternalWorkspace></div>
}
