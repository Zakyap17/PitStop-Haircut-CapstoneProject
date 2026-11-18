import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { heroThemeOrder, heroThemes, type HeroThemeId } from '@/data/hero-theme'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

type StyleCardsProps = {
  active: HeroThemeId
  onSelect: (id: HeroThemeId) => void
}

/** Dua kartu pilihan (Dewasa / Anak). Foto menyembul dari atas kartu dan miring saat di-hover. */
export function StyleCards({ active, onSelect }: StyleCardsProps) {
  const other = heroThemeOrder.find((id) => id !== active) as HeroThemeId

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-6">
      <div role="group" aria-label="Pilih kategori layanan" className="flex gap-4 pt-14">
        {heroThemeOrder.map((id) => {
          const theme = heroThemes[id]
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(id)}
              className={cn(
                'group relative flex w-[135px] flex-col items-center gap-3 rounded-[28px] border bg-white/5 px-3 pt-16 pb-4 text-center backdrop-blur-md transition-all duration-300',
                isActive ? 'border-pink' : 'border-white/10 hover:border-white/40 hover:bg-white/10',
              )}
            >
              <span className="absolute -top-12 left-1/2 size-[110px] -translate-x-1/2 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-4 group-hover:-rotate-12 group-hover:scale-110">
                <Image
                  src={theme.cardPhoto}
                  alt=""
                  fill
                  sizes="110px"
                  className="rounded-full object-cover shadow-[0_20px_35px_rgba(0,0,0,0.5)] ring-2 ring-white/30"
                />
              </span>
              <span className="flex w-full flex-col text-[0.7rem]">
                <span className="font-semibold">{theme.label}</span>
                <span className="text-white/70">{formatRupiah(theme.price)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-4">
        {[
          { label: 'Kategori sebelumnya', icon: ArrowLeft },
          { label: 'Kategori berikutnya', icon: ArrowRight },
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => onSelect(other)}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
