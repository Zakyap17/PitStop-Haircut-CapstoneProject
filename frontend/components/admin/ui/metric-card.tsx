import { adminCardClass } from '@/components/admin/ui/panel'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: string
  caption: string
  className?: string
}

/** Kartu angka ringkas ("Dashboard/Metric Card/Plain" di Figma). */
export function MetricCard({ label, value, caption, className }: MetricCardProps) {
  return (
    <div className={cn(adminCardClass, 'flex min-w-0 flex-col gap-2 p-5', className)}>
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="text-[28px] leading-normal font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}
