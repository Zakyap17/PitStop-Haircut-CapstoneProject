import Image from 'next/image'
import type { StatusTone } from '@/types/admin'
import { cn } from '@/lib/utils'

const toneStyles: Record<StatusTone, { dot: string; text: string }> = {
  success: { dot: '/icons/admin/dot-success.svg', text: 'text-success-fg' },
  warning: { dot: '/icons/admin/dot-warning.svg', text: 'text-warn-fg' },
  neutral: { dot: '/icons/admin/dot-neutral.svg', text: 'text-neutral-fg' },
}

/** Badge status: titik berwarna + teks (komponen "Badge/*" di Figma). */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const style = toneStyles[tone]
  return (
    <span className={cn('inline-flex items-center gap-1.5 py-1 text-xs font-medium whitespace-nowrap', style.text)}>
      <Image src={style.dot} alt="" width={6} height={6} unoptimized />
      {children}
    </span>
  )
}
