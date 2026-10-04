import Image from 'next/image'
import { Camera, Sparkles, Upload } from 'lucide-react'
import { cuts } from '@/lib/data'

const steps = [
  { icon: Camera, title: 'Aktifkan kamera', text: 'Atau unggah foto wajah. Semua diproses di browser kamu.' },
  { icon: Sparkles, title: 'Swipe template', text: 'Geser berbagai gaya rambut dan lihat hasilnya real-time.' },
  { icon: Upload, title: 'Bawa ke kapster', text: 'Simpan pilihanmu dan lampirkan saat reservasi.' },
]

export function TryOn() {
  return (
    <section id="try-on" className="border-t border-foreground/10 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 md:px-8 lg:grid-cols-2">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] ring-1 ring-foreground/15">
            <Image src={cuts[3].image || '/placeholder.svg'} alt="Pratinjau virtual try-on gaya French Crop" fill sizes="384px" className="object-cover" />
            <div className="absolute inset-6 rounded-[40%] border-2 border-dashed border-accent/70" aria-hidden="true" />
          </div>
          <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 gap-2 rounded-2xl border border-foreground/15 bg-background/80 p-2 backdrop-blur-xl">
            {cuts.slice(0, 5).map((cut, index) => (
              <span
                key={cut.name}
                className={`relative size-12 overflow-hidden rounded-xl ${index === 3 ? 'ring-2 ring-accent' : 'opacity-60'}`}
              >
                <Image src={cut.image || '/placeholder.svg'} alt="" fill sizes="48px" className="object-cover" />
              </span>
            ))}
          </div>
          <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Live Preview
          </span>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Virtual Try-On</p>
          <h2 className="mt-4 font-serif text-5xl leading-none text-balance md:text-6xl">
            Coba dulu, <em className="text-accent">baru</em> potong
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
            Bingung model yang cocok dengan bentuk wajah? Simulasikan gaya rambut langsung dari kamera sebelum duduk di
            kursi kapster.
          </p>
          <ol className="mt-10 flex flex-col gap-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-2xl border border-foreground/10 bg-card/50 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">0{index + 1}</span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
