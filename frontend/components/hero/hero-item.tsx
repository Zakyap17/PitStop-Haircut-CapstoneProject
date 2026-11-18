import Image from 'next/image'
import type { HeroItemContent, HeroSlot } from '@/data/hero-theme'

type HeroItemProps = {
  slot: HeroSlot
  content: HeroItemContent
  /** Ref callback dari useHeroMotion; transform elemen luar dikelola oleh hook, bukan React. */
  itemRef: (el: HTMLDivElement | null) => void
}

/** Satu elemen melayang di hero: foto gaya rambut bulat, atau bola kotak-kotak ala ban balap. */
export function HeroItem({ slot, content, itemRef }: HeroItemProps) {
  return (
    <div ref={itemRef} className="absolute will-change-transform" style={{ top: slot.top, left: slot.left, width: slot.size, height: slot.size }}>
      <div
        className="relative size-full overflow-hidden rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.3)] ring-2 ring-white/25"
        style={{ opacity: slot.opacity }}
      >
        {content.type === 'photo' ? (
          <Image src={content.src} alt={content.alt} fill sizes={`${slot.size}px`} className="object-cover" draggable={false} />
        ) : (
          <div
            aria-hidden="true"
            className="size-full"
            style={{
              backgroundImage: 'conic-gradient(#f3f1ea 25%, #1f4bff 0 50%, #f3f1ea 0 75%, #1f4bff 0)',
              backgroundSize: `${Math.max(16, Math.round(slot.size / 4))}px ${Math.max(16, Math.round(slot.size / 4))}px`,
            }}
          />
        )}
      </div>
    </div>
  )
}
