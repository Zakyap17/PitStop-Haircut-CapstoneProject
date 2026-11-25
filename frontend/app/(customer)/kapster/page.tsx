import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PageShell } from '@/components/pages/page-shell'
import { buttonVariants } from '@/components/ui/button'
import { getCatalog } from '@/lib/catalog'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Profil Kapster — Pit Stop Barbershop',
  description: 'Kenali kapster Pit Stop Barbershop: spesialisasi, pengalaman, hari kerja, dan hasil potongan mereka.',
  alternates: { canonical: '/kapster' },
}

const weekDays = [
  { day: 1, short: 'Sen' },
  { day: 2, short: 'Sel' },
  { day: 3, short: 'Rab' },
  { day: 4, short: 'Kam' },
  { day: 5, short: 'Jum' },
  { day: 6, short: 'Sab' },
  { day: 0, short: 'Min' },
]

export default async function BarbersPage() {
  const { barbers, haircuts } = await getCatalog()
  return (
    <PageShell
      eyebrow="Kru Pit Stop"
      title={
        <>
          Kenali <em className="text-accent">kapster</em> kami
        </>
      }
      intro="Setiap kapster punya spesialisasi dan hari libur sendiri. Hari libur mereka otomatis tidak bisa dipilih di form reservasi."
    >
      <ul className="flex flex-col gap-6">
        {barbers.map((barber) => {
          const works = haircuts.filter((haircut) => haircut.barberId === barber.id)
          return (
            <li key={barber.name} className="grid gap-8 rounded-3xl border border-foreground/10 bg-card/70 p-6 backdrop-blur md:p-8 lg:grid-cols-[320px_1fr]">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary font-display text-3xl text-primary-foreground">
                    {barber.name[0]}
                  </span>
                  <div>
                    <h2 className="font-display text-4xl uppercase leading-none">{barber.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{barber.role}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 border-t border-foreground/10 pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Spesialis</dt>
                    <dd className="font-medium">{barber.specialty}</dd>
                  </div>
                  {barber.experienceYears !== null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Pengalaman</dt>
                      <dd className="font-medium">{barber.experienceYears} tahun</dd>
                    </div>
                  )}
                </dl>

                <div>
                  <p className="text-xs text-muted-foreground">Hari kerja</p>
                  <ul className="mt-2 flex gap-1.5" aria-label={`Hari kerja ${barber.name}`}>
                    {weekDays.map(({ day, short }) => {
                      const off = barber.offDays.includes(day)
                      return (
                        <li
                          key={day}
                          aria-label={`${short}: ${off ? 'libur' : 'kerja'}`}
                          className={cn(
                            'flex h-9 flex-1 items-center justify-center rounded-lg border text-xs font-medium',
                            off ? 'border-foreground/10 text-muted-foreground/50 line-through' : 'border-accent/60 bg-accent/15 text-foreground',
                          )}
                        >
                          {short}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <Link href={`/?kapster=${encodeURIComponent(barber.id)}#reservasi`} className={cn(buttonVariants({ size: 'pill' }), 'mt-auto w-full')}>
                  Reservasi dengan {barber.name}
                </Link>
              </div>

              <div>
                <p className="text-xs tracking-[1.6px] text-muted-foreground uppercase">Hasil potongan {barber.name}</p>
                {works.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Belum ada karya yang ditampilkan.</p>
                ) : (
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                    {works.map((work) => (
                      <li key={work.name} className="group relative overflow-hidden rounded-2xl ring-1 ring-foreground/15">
                        <Image
                          src={work.image}
                          alt={`${work.name}, dipotong oleh ${barber.name}`}
                          width={400}
                          height={533}
                          sizes="(min-width: 1024px) 14vw, (min-width: 640px) 22vw, 45vw"
                          loading="lazy"
                          className="aspect-[3/4] w-full object-cover"
                        />
                        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-sm font-semibold">
                          {work.name}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </PageShell>
  )
}
