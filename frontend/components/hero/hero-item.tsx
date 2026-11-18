import type { HeroItemContent, HeroSlot } from '@/data/hero-theme'

type HeroItemProps = {
  slot: HeroSlot
  content: HeroItemContent
  /** Ref callback dari useHeroMotion; transform elemen luar dikelola oleh hook, bukan React. */
  itemRef: (el: HTMLDivElement | null) => void
}

/** Satu elemen melayang di hero: bola kotak-kotak ala ban balap (krem + warna tema). */
export function HeroItem({ slot, content, itemRef }: HeroItemProps) {
  const tile = Math.max(14, Math.round(slot.size / 4))
  return (
    <div ref={itemRef} className="absolute will-change-transform" style={{ top: slot.top, left: slot.left, width: slot.size, height: slot.size }}>
      <div
        aria-hidden="true"
        className="size-full rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.3)] ring-2 ring-white/25 transition-[background-image] duration-300"
        style={{
          opacity: slot.opacity,
          backgroundImage: `conic-gradient(#f3f1ea 25%, ${content.color} 0 50%, #f3f1ea 0 75%, ${content.color} 0)`,
          backgroundSize: `${tile}px ${tile}px`,
        }}
      />
    </div>
  )
}
