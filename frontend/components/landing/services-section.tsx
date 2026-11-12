import { Reveal } from '@/components/shared/reveal'
import { SectionContainer } from '@/components/shared/section-container'
import { SectionHeading } from '@/components/shared/section-heading'
import { services } from '@/data/services'
import { formatRupiah } from '@/lib/format'

export function ServicesSection() {
  return (
    <SectionContainer id="layanan">
      <SectionHeading eyebrow="Layanan" title="Garasi kami, gaya kamu." />

      <ul className="w-full max-w-[1000px] divide-y divide-border overflow-hidden rounded-[20px] border border-border bg-card">
        {services.map((service, index) => (
          <Reveal as="li" key={service.id} delay={index * 70} className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-5">
              <span className="font-display text-2xl leading-[1.05] tracking-[-0.025em] text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-semibold text-foreground sm:text-xl">{service.name}</h3>
                <p className="text-sm text-muted-foreground">{service.durationMinutes} menit</p>
              </div>
            </div>
            <p className="font-display text-xl leading-[1.05] tracking-[-0.025em] whitespace-nowrap text-foreground uppercase sm:text-[26px]">
              {formatRupiah(service.price)}
            </p>
          </Reveal>
        ))}
      </ul>
    </SectionContainer>
  )
}
