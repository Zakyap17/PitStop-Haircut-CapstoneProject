import { barbers } from '@/lib/data'

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function Barbers() {
  return (
    <section id="kapster" className="border-t border-foreground/10 bg-card/40 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Kru Pit Stop</p>
            <h2 className="mt-4 font-serif text-5xl leading-none md:text-6xl">
              Pilih <em className="text-accent">kapster</em> kamu
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Jadwal kerja setiap kapster tersinkron langsung ke form reservasi, jadi kamu hanya melihat kapster yang
            benar-benar tersedia.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {barbers.map((barber, index) => (
            <li
              key={barber.name}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-foreground/10 bg-background p-6 transition-colors hover:border-primary"
            >
              <div className="checker absolute -right-10 -top-10 size-32 rotate-12 opacity-30" aria-hidden="true" />
              <span className="relative flex size-16 items-center justify-center rounded-full bg-primary font-serif text-3xl text-primary-foreground">
                {barber.name[0]}
              </span>
              <span className="mt-6 font-mono text-xs text-muted-foreground">No. {String(index + 1).padStart(2, '0')}</span>
              <h3 className="font-serif text-3xl">{barber.name}</h3>
              <p className="text-sm text-muted-foreground">{barber.role}</p>
              <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-foreground/10 pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Spesialis</dt>
                  <dd className="font-medium">{barber.specialty}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pengalaman</dt>
                  <dd className="font-medium">{barber.experience} tahun</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Libur tiap {barber.offDays.map((d) => dayNames[d]).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
