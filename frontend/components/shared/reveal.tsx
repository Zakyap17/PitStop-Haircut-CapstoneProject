'use client'

import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { intro } from '@/lib/intro-store'
import { cn } from '@/lib/utils'

/** True saat elemen sudah masuk layar (sekali saja) dan, bila `afterIntro`, preloader sudah selesai. */
function useRevealed(afterIntro: boolean) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const introDone = useSyncExternalStore(intro.subscribe, intro.isFinished, intro.serverSnapshot)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, revealed: inView && (!afterIntro || introDone) }
}

type RevealProps = {
  as?: ElementType
  className?: string
  children?: ReactNode
  /** Jeda sebelum animasi mulai (ms). Dipakai untuk efek berurutan (stagger). */
  delay?: number
  /** Tunggu sampai preloader selesai, untuk elemen di bagian atas halaman. */
  afterIntro?: boolean
  id?: string
}

/** Elemen yang muncul dengan fade + naik pelan saat masuk layar. */
export function Reveal({ as: Tag = 'div', className, children, delay = 0, afterIntro = false, id }: RevealProps) {
  const { ref, revealed } = useRevealed(afterIntro)

  return (
    <Tag
      ref={ref}
      id={id}
      data-revealed={revealed ? '' : undefined}
      className={cn('fade-up', className)}
      style={{ '--delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

type RevealHeadingProps = {
  as?: ElementType
  text: string
  className?: string
  delay?: number
  afterIntro?: boolean
  /** Selisih waktu antar kata (ms). */
  wordStagger?: number
}

/**
 * Judul yang kata-katanya naik satu per satu dari balik "topeng".
 * Dipecah per kata (bukan per baris) supaya tetap rapi saat teks terbungkus di layar kecil.
 */
export function RevealHeading({ as: Tag = 'h2', text, className, delay = 0, afterIntro = false, wordStagger = 70 }: RevealHeadingProps) {
  const { ref, revealed } = useRevealed(afterIntro)
  const words = text.split(' ')

  return (
    <Tag ref={ref} data-revealed={revealed ? '' : undefined} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            <span className="reveal-mask">
              <span className="reveal-unit" style={{ '--delay': `${delay + index * wordStagger}ms` } as CSSProperties}>
                {word}
              </span>
            </span>
            {index < words.length - 1 && ' '}
          </span>
        ))}
      </span>
    </Tag>
  )
}
