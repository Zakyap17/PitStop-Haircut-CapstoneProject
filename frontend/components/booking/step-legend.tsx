import { cn } from '@/lib/utils'

type StepLegendProps = {
  /** Nomor langkah, ditulis dua digit. */
  step: number
  title: string
  /** Keterangan singkat di ujung kanan (opsional). */
  hint?: string
  className?: string
}

/** Judul satu langkah form: nomor kecil berwarna aksen dan judul besar huruf kapital. Dipakai sebagai <legend> sebuah <fieldset>. */
export function StepLegend({ step, title, hint, className }: StepLegendProps) {
  return (
    <legend className={cn('mb-4 flex w-full items-baseline gap-3 p-0', className)}>
      <span className="font-display text-sm tracking-[0.12em] text-accent">{String(step).padStart(2, '0')}</span>
      <span className="font-display text-2xl tracking-[0.02em] uppercase sm:text-[28px]">{title}</span>
      {hint && <span className="ml-auto hidden text-xs font-normal text-muted-foreground sm:block">{hint}</span>}
    </legend>
  )
}
