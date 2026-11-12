import { marqueeWords } from '@/data/site-content'

/** Pita biru berjalan. Daftar kata diulang dua kali agar loop animasi tidak terlihat putus. */
export function MarqueeStrip() {
  return (
    <section aria-label="Keunggulan Pit Stop" className="overflow-hidden bg-primary py-4">
      <div aria-hidden="true" className="flex w-max animate-marquee gap-12 pr-12">
        {[0, 1].flatMap((round) =>
          marqueeWords.map((word) => (
            <span key={`${round}-${word}`} className="font-display text-[22px] leading-[1.05] tracking-[1px] whitespace-nowrap text-white uppercase">
              {word}
            </span>
          )),
        )}
      </div>
      <p className="sr-only">{marqueeWords.join(', ')}</p>
    </section>
  )
}
