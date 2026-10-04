import { Clock } from 'lucide-react'
import { LiquidImage } from '@/components/liquid-image'
import { formatRupiah, services } from '@/lib/data'

export function Services() {
  return (
    <section id="layanan" className="relative border-t border-foreground/10 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Menu Layanan</p>
            <h2 className="mt-4 font-serif text-5xl leading-none text-balance md:text-6xl">
              Garasi kami, <em className="text-accent">gaya</em> kamu
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
              Dinding biru, lantai kotak-kotak ala garis finish, dan kursi mobil balap untuk si kecil. Semua dirancang
              agar potong rambut terasa seperti pit stop: cepat, presisi, menyenangkan.
            </p>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <LiquidImage
              src="/images/interior-kids.png"
              alt="Kursi mobil balap anak di Pit Stop Barbershop"
              sizes="(min-width: 1024px) 25vw, 60vw"
              className="col-span-3 aspect-[4/5] rounded-2xl ring-1 ring-foreground/15"
            />
            <div className="col-span-2 flex flex-col gap-3">
              <LiquidImage
                src="/images/interior-wide.png"
                alt="Interior Pit Stop Barbershop dengan panel biru"
                sizes="(min-width: 1024px) 18vw, 40vw"
                className="flex-1 rounded-2xl ring-1 ring-foreground/15"
              />
              <div className="checker flex aspect-square flex-col justify-end rounded-2xl bg-foreground p-4 ring-1 ring-foreground/15">
                <span className="w-fit rounded-md bg-background px-2 py-1 font-serif text-2xl leading-none">4 Kursi</span>
              </div>
            </div>
          </div>
        </div>

        <ul className="flex flex-col">
          {services.map((service, index) => (
            <li
              key={service.id}
              className="group flex items-start justify-between gap-6 border-b border-foreground/10 py-6 first:pt-0"
            >
              <div className="flex gap-5">
                <span className="pt-1 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-serif text-3xl transition-colors group-hover:text-accent">{service.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {service.duration} menit
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-foreground/15 px-4 py-1.5 text-sm font-semibold">
                {formatRupiah(service.price)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
