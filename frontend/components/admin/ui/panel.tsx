import Link from 'next/link'
import { cn } from '@/lib/utils'

/** Kartu putih dasar admin (border tipis, sudut 12px, bayangan halus). */
export const adminCardClass = 'rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(16,33,61,0.06)]'

type PanelProps = {
  title: string
  subtitle?: string
  action?: { label: string; href: string }
  children: React.ReactNode
  className?: string
}

/** Panel dengan judul, subjudul, dan tautan aksi di kanan atas. Isi (mis. tabel) menempel ke tepi. */
export function Panel({ title, subtitle, action, children, className }: PanelProps) {
  return (
    <section className={cn(adminCardClass, 'flex min-w-0 flex-col overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="text-[13px] font-medium whitespace-nowrap text-primary hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
