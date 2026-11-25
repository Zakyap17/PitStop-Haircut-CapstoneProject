import Image from 'next/image'
import { cn } from '@/lib/utils'

type PhotoFrameProps = {
  src: string
  alt: string
  /** Ukuran, bentuk, dan sudut dari pembungkus (mis. "aspect-[4/5] rounded-2xl"). */
  className?: string
  sizes?: string
  preload?: boolean
}

/** Foto biasa dalam bingkai: selalu tajam dan berwarna asli, tanpa efek distorsi atau blur. */
export function PhotoFrame({ src, alt, className, sizes = '50vw', preload }: PhotoFrameProps) {
  return (
    <figure className={cn('relative overflow-hidden bg-card', className)}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
    </figure>
  )
}
