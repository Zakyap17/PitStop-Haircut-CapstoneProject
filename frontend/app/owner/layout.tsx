import type { Metadata } from 'next'
import { InternalWorkspace } from '@/components/internal/internal-workspace'

export const metadata: Metadata = { title: 'PitStop · Owner', robots: { index: false, follow: false } }
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-theme"><InternalWorkspace allowed={['owner']}>{children}</InternalWorkspace></div>
}
