import { Eyebrow } from '@/components/eyebrow'
import { LiquidImage } from '@/components/liquid-image'
import { Lines, Reveal } from '@/components/reveal'

const principles = [
  {
    title: 'Presisi ala pit crew',
    body: 'Setiap potongan dikerjakan cepat tapi detail — konsultasi, eksekusi, finishing. Tanpa buang waktu, tanpa kompromi.',
  },
  {
    title: 'Anak-anak jadi pembalap',
    body: 'Kursi mobil balap dan kapster yang sabar bikin potong rambut pertama si kecil jadi momen seru, bukan drama.',
  },
  {
    title: 'Slot pasti, tanpa antre',
    body: 'Reservasi online mengunci jam dan kapster pilihanmu. Datang, duduk, langsung dikerjakan.',
  },
  {
    title: 'Lihat dulu, baru potong',
    body: 'Portofolio kapster dan virtual try-on membantu kamu memilih gaya sebelum gunting menyentuh rambut.',
  },
]

export function Story() {
  return (
    <section id="cerita" className="px-4 py-24 md:px-10 md:py-36">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <Eyebrow>Cerita Kami</Eyebrow>
          <Reveal as="h2" className="mt-6 max-w-[16ch] font-display text-5xl uppercase leading-[0.95] tracking-tight sm:text-7xl">
            <Lines lines={['Garasi tempat', 'gaya dirakit.']} />
          </Reveal>
          <Reveal className="fade-up mt-8 max-w-[46ch] text-lg leading-relaxed text-muted-foreground md:text-xl">
            <p>
              Dinding panel biru, lantai kotak-kotak ala garis finish, dan kursi mobil balap untuk si kecil. Pit Stop
              lahir dari satu ide sederhana: potong rambut harus secepat dan seteliti kru balap mengganti ban.
            </p>
          </Reveal>
          <Reveal className="fade-up mt-10" delay={120} style={{ '--y': '60px', '--dur': '620ms' } as React.CSSProperties}>
            <LiquidImage
              src="/images/interior-wide.png"
              alt="Interior Pit Stop Barbershop dengan panel dinding biru dan kursi mobil anak"
              className="aspect-[16/10] w-full rounded-sm"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </Reveal>
        </div>

        <ul className="lg:col-span-6 lg:pt-2">
          {principles.map((item, index) => (
            <Reveal
              as="li"
              key={item.title}
              delay={index * 90}
              className="fade-up grid grid-cols-[auto_1fr] gap-x-6 border-t border-border py-8 last:border-b"
            >
              <span className="text-2xl font-semibold tabular-nums text-accent">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 max-w-[44ch] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
