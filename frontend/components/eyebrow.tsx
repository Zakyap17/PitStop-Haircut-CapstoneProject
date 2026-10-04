import { cn } from '@/lib/utils'

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 text-[13px] font-medium uppercase leading-tight tracking-[0.22em] text-muted-foreground',
        className,
      )}
    >
      <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
      {children}
    </p>
  )
}
