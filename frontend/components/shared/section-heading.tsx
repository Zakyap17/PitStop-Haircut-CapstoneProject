import { Reveal, RevealHeading } from '@/components/shared/reveal'
import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  eyebrow: string
  title: string
  description?: string
  className?: string
}

/** Judul section landing: eyebrow kecil, judul Anton besar (animasi per kata), dan deskripsi opsional. */
export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3.5 text-center', className)}>
      <Reveal as="p" className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">
        {eyebrow}
      </Reveal>
      <RevealHeading
        text={title}
        delay={80}
        className="font-display text-[40px] leading-[1.05] tracking-[-0.025em] text-balance text-foreground uppercase sm:text-5xl lg:text-[56px]"
      />
      {description && (
        <Reveal as="p" delay={250} className="max-w-[560px] leading-normal text-muted-foreground">
          {description}
        </Reveal>
      )}
    </div>
  )
}
