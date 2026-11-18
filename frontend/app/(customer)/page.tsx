import { BarbersSection } from '@/components/landing/barbers-section'
import { BookingSection } from '@/components/landing/booking-section'
import { CheckerStrip } from '@/components/landing/checker-strip'
import { HeroSection } from '@/components/landing/hero-section'
import { MarqueeStrip } from '@/components/landing/marquee-strip'
import { PortfolioSection } from '@/components/landing/portfolio-section'
import { Preloader } from '@/components/landing/preloader'
import { ServicesSection } from '@/components/landing/services-section'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteNavbar } from '@/components/landing/site-navbar'
import { StatsSection } from '@/components/landing/stats-section'
import { StorySection } from '@/components/landing/story-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { TryOnSection } from '@/components/landing/try-on-section'
import { BarbershopJsonLd } from '@/components/seo/barbershop-json-ld'
import { SkipLink } from '@/components/shared/skip-link'
import { SmoothScroll } from '@/components/shared/smooth-scroll'

export default function LandingPage() {
  return (
    <>
      <SkipLink />
      <BarbershopJsonLd />
      <Preloader />
      <SmoothScroll />
      <SiteNavbar />
      <main id="konten" className="relative w-full overflow-x-hidden">
        <HeroSection />
        <MarqueeStrip />
        <CheckerStrip />
        <StorySection />
        <PortfolioSection />
        <ServicesSection />
        <BarbersSection />
        <StatsSection />
        <CheckerStrip />
        <TryOnSection />
        <CheckerStrip />
        <TestimonialsSection />
        <BookingSection />
        <CheckerStrip />
      </main>
      <SiteFooter />
    </>
  )
}
