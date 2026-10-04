import { Barbers } from '@/components/barbers'
import { Booking } from '@/components/booking'
import { Hero } from '@/components/hero'
import { Impact } from '@/components/impact'
import { Marquee } from '@/components/marquee'
import { PortfolioCarousel } from '@/components/portfolio-carousel'
import { Preloader } from '@/components/preloader'
import { Services } from '@/components/services'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SmoothScroll } from '@/components/smooth-scroll'
import { Story } from '@/components/story'
import { TryOn } from '@/components/try-on'
import { Voices } from '@/components/voices'

export default function Page() {
  return (
    <>
      <Preloader />
      <SmoothScroll />
      <SiteHeader />
      <main className="relative w-full overflow-x-hidden">
        <Hero />
        <Marquee />
        <Story />
        <PortfolioCarousel />
        <Services />
        <Barbers />
        <Impact />
        <TryOn />
        <Voices />
        <Booking />
      </main>
      <SiteFooter />
    </>
  )
}
