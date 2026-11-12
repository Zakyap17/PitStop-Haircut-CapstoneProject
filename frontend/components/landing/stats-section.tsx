import { Reveal } from '@/components/shared/reveal'
import { stats } from '@/data/site-content'

export function StatsSection() {
  return (
    <section aria-label="Pit Stop dalam angka" className="px-6 py-14 md:px-12 lg:px-24 lg:py-[72px]">
      <dl className="mx-auto grid max-w-[1248px] grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 110} className="flex flex-col-reverse items-center gap-1.5 text-center">
            <dt className="text-sm font-medium text-muted-foreground">{stat.label}</dt>
            <dd className="font-display text-5xl leading-[1.05] tracking-[-0.025em] whitespace-nowrap text-accent sm:text-6xl lg:text-[80px]">
              {stat.value}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  )
}
