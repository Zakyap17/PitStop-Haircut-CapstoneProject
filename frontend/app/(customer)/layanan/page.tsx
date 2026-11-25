import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { PageShell } from '@/components/pages/page-shell'
import { buttonVariants } from '@/components/ui/button'
import { services } from '@/data/services'
import { formatRupiah } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Layanan & Harga — Pit Stop Barbershop',
  description: 'Daftar layanan Pit Stop Barbershop beserta harga dan lama pengerjaan: haircut dewasa dan anak, premium fade, shaving, hair coloring, hair spa.',
  alternates: { canonical: '/layanan' },
}

export default function ServicesPage() {
  return (
    <PageShell
      eyebrow="Menu Layanan"
      title={
        <>
          Layanan & <em className="text-accent">harga</em>
        </>
      }
      intro="Semua harga sudah termasuk konsultasi gaya. Lama pengerjaan membantumu memilih jam yang pas, dan slot dikunci sesuai durasinya."
    >
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => (
          <li key={service.id} className="flex flex-col rounded-3xl border border-foreground/10 bg-card/70 p-6 backdrop-blur">
            <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
            <h2 className="mt-3 font-display text-3xl uppercase">{service.name}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
            <div className="mt-6 flex items-end justify-between gap-4 border-t border-foreground/10 pt-4">
              <div>
                <p className="font-display text-3xl">{formatRupiah(service.price)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {service.durationMinutes} menit
                </p>
              </div>
              <Link
                href={`/?layanan=${service.id}#reservasi`}
                aria-label={`Reservasi ${service.name}`}
                className={buttonVariants({ variant: 'outline-strong', size: 'pill', className: 'px-5 py-2.5' })}
              >
                Reservasi
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-14 grid gap-3 sm:grid-cols-2">
        <Image
          src="/images/interior/interior-kids.png"
          alt="Kursi mobil balap anak di Pit Stop Barbershop"
          width={1200}
          height={900}
          sizes="(min-width: 640px) 50vw, 100vw"
          loading="eager"
          className="aspect-[4/3] w-full rounded-3xl object-cover ring-1 ring-foreground/15"
        />
        <Image
          src="/images/interior/interior-wide.png"
          alt="Interior Pit Stop Barbershop dengan panel biru dan lantai kotak-kotak"
          width={1200}
          height={900}
          sizes="(min-width: 640px) 50vw, 100vw"
          loading="eager"
          className="aspect-[4/3] w-full rounded-3xl object-cover ring-1 ring-foreground/15"
        />
      </div>
    </PageShell>
  )
}
