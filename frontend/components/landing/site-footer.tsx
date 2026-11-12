import { BrandLogo } from '@/components/shared/brand-logo'
import { operatingHours, socialLinks } from '@/data/site-content'

const columnTitleClass = 'text-xs font-semibold tracking-[1.6px] text-accent uppercase'

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-10 bg-background px-6 pt-16 pb-10 md:px-12 lg:px-24">
      <div className="mx-auto flex w-full max-w-[1248px] flex-col justify-between gap-10 md:flex-row">
        <div className="flex flex-col gap-3.5">
          <BrandLogo />
          <p className="text-sm text-muted-foreground">Pit Stop Barbershop · Men &amp; Kids</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className={columnTitleClass}>Jam operasional</p>
          <ul className="text-sm leading-[1.6] text-muted-foreground">
            {operatingHours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className={columnTitleClass}>Ikuti kami</p>
          {/* Tautan sosial belum ada URL-nya; isi di data/site-content.ts saat akun resmi tersedia. */}
          <ul className="text-sm leading-[1.6] text-muted-foreground">
            {socialLinks.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1248px] border-t border-border pt-10">
        <p className="text-[13px] text-muted-foreground">© 2026 Pit Stop Barbershop</p>
      </div>
    </footer>
  )
}
