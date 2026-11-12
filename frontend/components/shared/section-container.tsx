import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type SectionContainerProps = ComponentProps<'section'> & {
  /** Kelas tambahan untuk wadah isi (di dalam padding section). */
  innerClassName?: string
}

/** Section dengan padding responsif (96px di desktop) dan lebar isi maksimal 1248px, sesuai Figma. */
export function SectionContainer({ className, innerClassName, children, ...props }: SectionContainerProps) {
  return (
    <section className={cn('scroll-mt-20 px-6 py-16 md:px-12 lg:px-24 lg:py-24', className)} {...props}>
      <div className={cn('mx-auto flex w-full max-w-[1248px] flex-col items-center gap-12', innerClassName)}>{children}</div>
    </section>
  )
}
