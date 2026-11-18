import { adminCardClass } from '@/components/admin/ui/panel'
import { cn } from '@/lib/utils'

export function OperationsSummaryPanel({ items }: { items: { label: string; value: string }[] }) {
  return (
    <section className={cn(adminCardClass, 'flex flex-col gap-4 p-6')}>
      <h2 className="text-base font-semibold text-foreground">Ringkasan operasional</h2>
      <dl className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="text-sm font-medium text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
