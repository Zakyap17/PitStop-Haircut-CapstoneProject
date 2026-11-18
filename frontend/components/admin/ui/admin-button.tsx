import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Gaya tombol admin ("Dashboard/Button/*" di Figma). Dipakai langsung di <Link> atau lewat <AdminButton>. */
export const adminButtonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary/90',
        outline: 'border border-border bg-card text-foreground hover:bg-background',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)

type AdminButtonProps = ComponentProps<'button'> & VariantProps<typeof adminButtonVariants>

export function AdminButton({ variant, className, type = 'button', ...props }: AdminButtonProps) {
  return <button type={type} className={cn(adminButtonVariants({ variant }), className)} {...props} />
}
