import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type ChipProps = ComponentProps<'button'> & {
  selected?: boolean
}

/**
 * Chip bulat halaman customer (komponen "Customer/Chip/Default" di Figma).
 * Terpilih = biru solid seperti di desain; tidak terpilih = biru redup agar pilihan terlihat jelas.
 */
export function Chip({ selected = false, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'rounded-full px-[18px] py-2 text-[13px] font-medium whitespace-nowrap text-white transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected ? 'bg-primary' : 'bg-primary/25 hover:bg-primary/50 disabled:hover:bg-primary/25',
        className,
      )}
      {...props}
    />
  )
}
