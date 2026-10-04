const words = ['Fade Presisi', 'Kursi Mobil Balap', 'Tanpa Antre', 'Men & Kids', 'Reservasi Online']

export function Marquee() {
  return (
    <section aria-label="Keunggulan Pit Stop" className="overflow-hidden border-y border-border py-8">
      <div className="flex w-max animate-marquee flex-nowrap" aria-hidden="true">
        {[0, 1].flatMap((round) =>
          words.map((word) => (
            <span key={`${round}-${word}`} className="flex items-center">
              <span className="whitespace-nowrap font-display text-4xl uppercase tracking-tight sm:text-5xl">{word}</span>
              <span className="mx-8 size-2.5 rounded-full bg-accent" />
            </span>
          )),
        )}
      </div>
      <p className="sr-only">{words.join(', ')}</p>
    </section>
  )
}
