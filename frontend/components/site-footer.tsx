import { Eyebrow } from '@/components/eyebrow'
import { Lines, Reveal } from '@/components/reveal'

const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com' },
  { label: 'TikTok', href: 'https://www.tiktok.com' },
  { label: 'Google Maps', href: 'https://maps.google.com' },
]

export function SiteFooter() {
  return (
    <footer id="kontak" className="px-4 pt-24 md:px-10 md:pt-36">
      <Eyebrow>Masuk Pit</Eyebrow>
      <Reveal as="h2" className="mt-6 max-w-[18ch] font-display text-6xl uppercase leading-[0.95] tracking-tight sm:text-8xl">
        <Lines lines={['Rambut sudah', 'waktunya', 'ganti ban?']} />
      </Reveal>
      <Reveal className="fade-up mt-8 max-w-[44ch] text-lg leading-relaxed text-muted-foreground md:text-xl">
        <p>Kunci slotmu sekarang. Walk-in tetap dilayani sesuai slot yang tersedia.</p>
      </Reveal>
      <a
        href="#reservasi"
        className="group mt-12 inline-flex items-baseline gap-3 text-3xl font-semibold tracking-tight transition-all duration-300 hover:translate-x-3.5 hover:text-accent sm:gap-4 sm:text-6xl"
      >
        Reservasi sekarang
        <span className="text-accent" aria-hidden="true">
          ↗
        </span>
      </a>

      <div className="mt-24 grid gap-10 border-t border-border py-12 md:mt-36 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-display text-5xl uppercase leading-none tracking-tight">Pit Stop</p>
          <p className="mt-4 text-[13px] uppercase tracking-[0.22em] text-muted-foreground">
            Barbershop — Men & Kids
          </p>
        </div>
        <div className="text-sm lg:col-span-3">
          <p className="text-[13px] uppercase tracking-[0.18em] text-muted-foreground">Jam Operasional</p>
          <p className="mt-3">Setiap hari · 10.00 – 21.00 WIB</p>
          <p className="text-muted-foreground">Istirahat · 18.00 – 19.00 WIB</p>
        </div>
        <nav aria-label="Sosial media" className="lg:col-span-2">
          <ul className="flex flex-col gap-2">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-center gap-0 text-muted-foreground transition-all hover:gap-3 hover:text-foreground"
                >
                  <span className="h-px w-0 bg-accent transition-all group-hover:w-6" aria-hidden="true" />
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-[13px] uppercase tracking-[0.18em] text-muted-foreground lg:col-span-2 lg:text-right">
          © 2026 Pit Stop Barbershop.
        </p>
      </div>
      <div className="checker -mx-4 h-6 opacity-80 md:-mx-10" aria-hidden="true" />
    </footer>
  )
}
