'use client'

import { useState } from 'react'
import { LiquidImage } from '@/components/shared/liquid-image'
import { Reveal, RevealHeading } from '@/components/shared/reveal'
import { SectionContainer } from '@/components/shared/section-container'
import { Chip } from '@/components/ui/chip'
import { tryOnSteps } from '@/data/site-content'

/** Template yang bisa dicoba. Preview masih memakai foto contoh; kamera/unggah foto dikerjakan di tahap fitur try-on. */
const tryOnTemplates = [
  { label: 'Skin Fade', imageSrc: '/images/cuts/skin-fade.png' },
  { label: 'Pompadour', imageSrc: '/images/cuts/pompadour.png' },
  { label: 'Kids Cut', imageSrc: '/images/cuts/kids-undercut.png' },
  { label: 'French Crop', imageSrc: '/images/cuts/french-crop.png' },
  { label: 'Buzz', imageSrc: '/images/cuts/buzz-and-beard.png' },
]

export function TryOnSection() {
  const [activeLabel, setActiveLabel] = useState('French Crop')
  const activeTemplate = tryOnTemplates.find((template) => template.label === activeLabel) ?? tryOnTemplates[0]

  return (
    <SectionContainer id="try-on" className="bg-card" innerClassName="items-center gap-10 lg:flex-row lg:gap-16">
      <Reveal className="aspect-square w-full max-w-[520px] shrink-0">
        <LiquidImage
          src={activeTemplate.imageSrc}
          alt={`Pratinjau virtual try-on gaya ${activeTemplate.label}`}
          sizes="(min-width: 1024px) 520px, 100vw"
          className="size-full rounded-3xl"
        />
      </Reveal>

      <div className="flex w-full max-w-[600px] flex-col items-start gap-7">
        <Reveal as="p" className="text-[13px] font-semibold tracking-[2.4px] text-accent uppercase">
          Virtual try-on
        </Reveal>
        <RevealHeading
          text="Coba dulu, baru potong."
          delay={80}
          className="font-display text-5xl leading-[1.05] tracking-[-0.025em] text-foreground uppercase lg:text-[64px]"
        />

        <ol className="flex flex-col gap-6">
          {tryOnSteps.map((step, index) => (
            <Reveal as="li" key={step} delay={250 + index * 120} className="flex items-center gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white">
                {index + 1}
              </span>
              <p className="text-base leading-[1.45] text-muted-foreground">{step}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={650} className="flex flex-wrap gap-2.5">
          <div role="group" aria-label="Pilih template gaya rambut" className="flex flex-wrap gap-2.5">
            {tryOnTemplates.map((template) => (
              <Chip key={template.label} selected={activeLabel === template.label} onClick={() => setActiveLabel(template.label)}>
                {template.label}
              </Chip>
            ))}
          </div>
        </Reveal>
      </div>
    </SectionContainer>
  )
}
