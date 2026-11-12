import { Reveal } from '@/components/shared/reveal'
import { SectionContainer } from '@/components/shared/section-container'
import { SectionHeading } from '@/components/shared/section-heading'
import { barbers } from '@/data/barbers'

export function BarbersSection() {
  return (
    <SectionContainer id="kapster" className="bg-card">
      <SectionHeading eyebrow="Kapster" title="Pilih kapster kamu." description="Jadwal kapster tersinkron dengan form reservasi." />

      <ul className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {barbers.map((barber, index) => (
          <Reveal as="li" key={barber.name} delay={index * 100} className="flex flex-col gap-4 rounded-[20px] border border-border bg-background px-4 pt-4 pb-6">
            {/* Placeholder foto kapster, sesuai Figma. Ganti dengan <Image> saat foto asli tersedia. */}
            <div className="flex h-[260px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-border bg-muted">
              <span className="font-display text-[51.2px] leading-[1.05] tracking-[-0.025em] text-border-strong">PS</span>
              <span className="text-xs font-medium text-muted-foreground">Foto {barber.name}</span>
            </div>
            <div className="flex flex-col gap-1 px-2">
              <h3 className="font-display text-[30px] leading-[1.05] tracking-[-0.025em] text-foreground uppercase">{barber.name}</h3>
              <p className="text-sm font-medium text-accent">
                {barber.role} · {barber.experienceYears} tahun
              </p>
              <p className="text-sm text-muted-foreground">Spesialis: {barber.specialty}</p>
              <p className="text-[13px] text-muted-foreground">Libur {barber.dayOffLabel}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </SectionContainer>
  )
}
