import { Camera, Sparkles, Upload } from 'lucide-react'
import { TryOnStudio } from '@/components/try-on/try-on-studio'

const steps = [
  { icon: Camera, title: 'Aktifkan kamera', text: 'Atau unggah foto wajah. Semua diproses di browser kamu.' },
  { icon: Sparkles, title: 'Swipe template', text: 'Geser berbagai gaya rambut dan bandingkan langsung dengan wajahmu.' },
  { icon: Upload, title: 'Bawa ke kapster', text: 'Simpan pilihanmu dan lampirkan saat reservasi.' },
]

export function TryOnSection() {
  return (
    <section id="try-on" className="checker-backdrop border-t border-foreground/10 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl items-start gap-14 px-4 md:px-8 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-xl">
          <TryOnStudio />
        </div>

        <div className="lg:pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Virtual Try-On</p>
          <h2 className="mt-4 font-serif text-5xl leading-none text-balance md:text-6xl">
            Coba dulu, <em className="text-accent">baru</em> potong
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
            Bingung model yang cocok dengan bentuk wajah? Nyalakan kamera, lihat wajahmu berdampingan dengan contoh gaya
            rambut, lalu simpan pilihanmu sebelum duduk di kursi kapster.
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
