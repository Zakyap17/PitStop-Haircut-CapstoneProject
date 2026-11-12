import { Reveal } from '@/components/shared/reveal'
import { SectionContainer } from '@/components/shared/section-container'
import { SectionHeading } from '@/components/shared/section-heading'
import { testimonials } from '@/data/testimonials'

export function TestimonialsSection() {
  return (
    <SectionContainer id="testimoni">
      <SectionHeading eyebrow="Testimoni" title="Kata mereka." />

      <ul className="grid w-full items-start gap-6 md:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <Reveal as="li" key={testimonial.name} delay={index * 120}>
            <figure className="flex flex-col gap-5 rounded-[20px] border border-border bg-card p-8">
              <span aria-hidden="true" className="font-display text-[64px] leading-[1.05] tracking-[-0.025em] text-accent">
                “
              </span>
              <blockquote className="text-base leading-normal text-foreground">{testimonial.quote}</blockquote>
              <figcaption className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-foreground">{testimonial.name}</span>
                <span className="text-[13px] text-muted-foreground">{testimonial.role}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </SectionContainer>
  )
}
