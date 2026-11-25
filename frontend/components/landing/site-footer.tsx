import Link from 'next/link'
import { Eyebrow } from '@/components/shared/eyebrow'
import { fullAddress, location } from '@/data/location'
import { getCatalog } from '@/lib/catalog'
import { dotTime } from '@/lib/format'
import { Lines, Reveal } from '@/components/shared/reveal'

const pages = [
  { href: '/layanan', label: 'Layanan & Harga' },
  { href: '/kapster', label: 'Profil Kapster' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/lokasi', label: 'Lokasi & Jam Buka' },
]

const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com' },
  { label: 'TikTok', href: 'https://www.tiktok.com' },
  { label: 'Google Maps', href: location.mapsUrl },
]

export async function SiteFooter() {
  const { booking } = await getCatalog()
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

      <p className="mt-6 text-sm text-muted-foreground">
        Sudah punya reservasi?{' '}
        <Link href="/cek-reservasi" className="text-accent underline underline-offset-4 hover:text-foreground">
          Cek di sini
        </Link>
      </p>

      <div className="mt-24 grid gap-10 border-t border-border py-12 md:mt-36 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <p className="font-display text-5xl uppercase leading-none tracking-tight">Pit Stop</p>
          <p className="mt-4 text-[13px] uppercase tracking-[0.22em] text-muted-foreground">
            Barbershop — Men & Kids
          </p>
        </div>
        <div className="text-sm lg:col-span-3">
          <p className="text-[13px] uppercase tracking-[0.18em] text-muted-foreground">Jam Operasional</p>
          <p className="mt-3">
            Setiap hari · {dotTime(booking.opensAt)} – {dotTime(booking.closesAt)} WIB
          </p>
          {booking.breakFrom && booking.breakTo && (
            <p className="text-muted-foreground">
              Istirahat · {dotTime(booking.breakFrom)} – {dotTime(booking.breakTo)} WIB
            </p>
          )}
          <p className="mt-4 text-[13px] uppercase tracking-[0.18em] text-muted-foreground">Alamat</p>
          <address className="mt-2 not-italic text-muted-foreground">{fullAddress}</address>
        </div>
        <nav aria-label="Halaman" className="lg:col-span-2">
          <ul className="flex flex-col gap-2 text-muted-foreground">
            {pages.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="transition-colors hover:text-foreground">
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
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
