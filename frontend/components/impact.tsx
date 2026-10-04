import { Eyebrow } from '@/components/eyebrow'
import { Lines, Reveal } from '@/components/reveal'

const stats = [
  { value: '1.200+', label: 'Potongan rambut dikerjakan' },
  { value: '4.9', label: 'Rating rata-rata pelanggan' },
  { value: '4', label: 'Kapster siap di pit' },
  { value: '0′', label: 'Menit antre dengan reservasi' },
]

export function Impact() {
  return (
    <section id="angka" className="px-4 py-24 md:px-10 md:py-36">
      <Eyebrow>Dalam Angka</Eyebrow>
      <Reveal as="h2" className="mt-6 font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">
        <Lines lines={['Tiap kursi, terukur.']} />
      </Reveal>

      <dl className="mt-16 grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal
            key={stat.label}
            delay={index * 110}
            className="fade-up group flex flex-col gap-4 border-b border-border py-10 sm:[&:nth-child(even)]:border-l sm:[&:nth-child(even)]:pl-8 lg:py-12 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8"
          >
            <dt className="order-2 max-w-[20ch] uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</dt>
            <dd className="order-1 font-display text-7xl leading-none tracking-tight transition-colors duration-300 group-hover:text-accent sm:text-8xl">
              {stat.value}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  )
}
