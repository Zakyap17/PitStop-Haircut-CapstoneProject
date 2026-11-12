import { LiquidImage } from '@/components/shared/liquid-image'
import { Reveal } from '@/components/shared/reveal'
import { SectionContainer } from '@/components/shared/section-container'
import { SectionHeading } from '@/components/shared/section-heading'
import { storyFeatures } from '@/data/site-content'

export function StorySection() {
  return (
    <SectionContainer id="cerita" innerClassName="gap-14">
      <SectionHeading eyebrow="Cerita kami" title="Garasi tempat gaya dirakit." />

      <div className="grid w-full items-start gap-8 lg:grid-cols-[560px_1fr]">
        <Reveal>
          <LiquidImage
            src="/images/landing/story-interior.png"
            alt="Kursi kapster dan mobil balap anak di Pit Stop Barbershop"
            sizes="(min-width: 1024px) 560px, 100vw"
            className="h-[360px] rounded-3xl sm:h-[520px]"
          />
        </Reveal>

        <ol className="flex flex-col gap-5">
          {storyFeatures.map((feature, index) => (
            <Reveal as="li" key={feature.title} delay={index * 110} className="flex flex-col gap-2 rounded-[20px] border border-border bg-card px-7 py-6">
              <div className="flex items-center gap-3.5">
                <span className="font-display text-[28px] leading-[1.05] tracking-[-0.025em] text-accent">0{index + 1}</span>
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
              </div>
              <p className="text-[15px] leading-normal text-muted-foreground">{feature.description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </SectionContainer>
  )
}
