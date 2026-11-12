'use client'

import { useState } from 'react'
import { LiquidImage } from '@/components/shared/liquid-image'
import { Reveal } from '@/components/shared/reveal'
import { SectionContainer } from '@/components/shared/section-container'
import { SectionHeading } from '@/components/shared/section-heading'
import { Chip } from '@/components/ui/chip'
import { ALL_CATEGORIES_LABEL, haircutCategories, haircuts } from '@/data/haircuts'

export function PortfolioSection() {
  const [activeCategory, setActiveCategory] = useState<(typeof haircutCategories)[number]>(ALL_CATEGORIES_LABEL)

  const visibleHaircuts =
    activeCategory === ALL_CATEGORIES_LABEL ? haircuts : haircuts.filter((haircut) => haircut.category === activeCategory)

  return (
    <SectionContainer id="portofolio" className="bg-card" innerClassName="gap-10">
      <SectionHeading eyebrow="Portofolio kapster · Vol. 01" title="Hasil cukur, dibingkai rapi." />

      <div role="group" aria-label="Filter kategori gaya rambut" className="flex flex-wrap justify-center gap-2.5">
        {haircutCategories.map((category) => (
          <Chip key={category} selected={activeCategory === category} onClick={() => setActiveCategory(category)}>
            {category}
          </Chip>
        ))}
      </div>

      <Reveal as="ul" className="-mx-6 flex w-[calc(100%+3rem)] snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 md:mx-0 md:w-full md:px-0">
        {visibleHaircuts.map((haircut) => (
          <li key={haircut.name} className="flex w-[288px] shrink-0 snap-start flex-col gap-3">
            <LiquidImage
              src={haircut.imageSrc}
              alt={`Gaya rambut ${haircut.name} oleh ${haircut.barberName}`}
              sizes="288px"
              className="h-[340px] rounded-[20px]"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[17px] font-semibold text-foreground">{haircut.name}</h3>
                <p className="text-[13px] text-muted-foreground">
                  {haircut.barberName} · {haircut.category}
                </p>
              </div>
              <p className="text-sm font-bold text-accent">{haircut.rating}</p>
            </div>
          </li>
        ))}
      </Reveal>

      <p className="text-[13px] text-muted-foreground" aria-live="polite">
        {visibleHaircuts.length} / {haircuts.length} gaya · geser untuk melihat gaya lain
      </p>
    </SectionContainer>
  )
}
