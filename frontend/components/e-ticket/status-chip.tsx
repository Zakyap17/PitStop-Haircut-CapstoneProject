import { cn } from '@/lib/utils'

type Tone = 'waiting' | 'confirmed' | 'cancelled' | 'neutral'

const TONES: Record<Tone, string> = {
  waiting: 'bg-amber-400/12 text-amber-200 ring-amber-300/30',
  confirmed: 'bg-emerald-400/12 text-emerald-200 ring-emerald-300/30',
  cancelled: 'bg-red-400/12 text-red-200 ring-red-300/30',
  neutral: 'bg-foreground/8 text-foreground ring-foreground/20',
}

/** Penanda status berupa teks berwarna dengan titik. Warna bukan satu-satunya penanda: selalu ada kata statusnya. */
export function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase ring-1', TONES[tone])}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
