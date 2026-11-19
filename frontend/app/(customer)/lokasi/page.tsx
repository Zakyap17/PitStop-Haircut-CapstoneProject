import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, MapPin, Navigation } from 'lucide-react'
import { PageShell } from '@/components/pages/page-shell'
import { buttonVariants } from '@/components/ui/button'
import { directionsUrl, fullAddress, location, mapEmbedUrl } from '@/data/location'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Lokasi & Jam Buka — Pit Stop Barbershop',
  description: `Pit Stop Barbershop Men & Kids di ${location.street}, ${location.city}. Buka setiap hari pukul ${location.opensAt}–${location.closesAt} WIB.`,
  alternates: { canonical: '/lokasi' },
}

const dot = (time: string) => time.replace(':', '.')

export default function LocationPage() {
  return (
    <PageShell
      eyebrow="Kunjungi Kami"
      title={
        <>
          Lokasi & <em className="text-accent">jam</em> buka
        </>
      }
      intro="Datang langsung atau kunci slot lebih dulu lewat reservasi online. Tunjukkan kode reservasi ke kasir saat tiba."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex flex-col gap-4">
          <section className="rounded-3xl border border-foreground/10 bg-card/70 p-6 backdrop-blur">
            <h2 className="flex items-center gap-2 text-xs tracking-[1.6px] text-muted-foreground uppercase">
              <MapPin className="size-4 text-accent" aria-hidden="true" />
              Alamat
            </h2>
            <address className="mt-3 text-lg leading-snug font-semibold not-italic">
              {location.street},<br />
              {location.district},<br />
              {location.city}, {location.province} {location.postalCode}
            </address>
          </section>

          <section className="rounded-3xl border border-foreground/10 bg-card/70 p-6 backdrop-blur">
            <h2 className="flex items-center gap-2 text-xs tracking-[1.6px] text-muted-foreground uppercase">
              <Clock className="size-4 text-accent" aria-hidden="true" />
              Jam operasional
            </h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Setiap hari</dt>
                <dd className="font-semibold">
                  {dot(location.opensAt)} – {dot(location.closesAt)} WIB
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Istirahat</dt>
                <dd className="font-semibold">
                  {dot(location.breakFrom)} – {dot(location.breakTo)} WIB
                </dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-wrap gap-3">
            <a href={directionsUrl} target="_blank" rel="noreferrer noopener" className={cn(buttonVariants({ size: 'pill' }), 'flex-1')}>
              <Navigation className="size-4" aria-hidden="true" />
              Petunjuk Arah
            </a>
            <a
              href={location.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: 'outline-strong', size: 'pill' }), 'flex-1 px-6')}
            >
              Buka di Google Maps
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Belum punya slot?{' '}
            <Link href="/#reservasi" className="text-accent underline underline-offset-4 hover:text-foreground">
              Reservasi online
            </Link>
          </p>
        </div>

        <div className="min-h-[360px] overflow-hidden rounded-3xl border border-foreground/10 bg-card/70 lg:min-h-[520px]">
          <iframe
            title={`Peta lokasi ${location.name}, ${fullAddress}`}
            src={mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full min-h-[360px] border-0 lg:min-h-[520px]"
          />
        </div>
      </div>
    </PageShell>
  )
}
