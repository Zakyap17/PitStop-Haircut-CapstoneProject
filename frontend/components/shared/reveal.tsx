'use client'

import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { intro } from '@/lib/intro-store'

type RevealProps = {
  as?: ElementType
  className?: string
  children?: ReactNode
  delay?: number
  afterIntro?: boolean
  style?: CSSProperties
  id?: string
}

export function Reveal({ as: Tag = 'div', className, children, delay = 0, afterIntro = false, style, id }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const introDone = useSyncExternalStore(intro.subscribe, intro.isFinished, intro.serverSnapshot)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const revealed = inView && (!afterIntro || introDone)

  return (
    <Tag
      ref={ref}
      id={id}
      data-revealed={revealed ? '' : undefined}
      className={className}
      style={{ '--delay': `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

export function Letters({ text, baseDelay = 0, stagger = 52 }: { text: string; baseDelay?: number; stagger?: number }) {
  return (
    <span className="reveal-line whitespace-nowrap" aria-hidden="true">
      {Array.from(text).map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="reveal-unit"
          style={{ '--delay': `${baseDelay + index * stagger}ms` } as CSSProperties}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  )
}

/** Satu baris judul: teks biasa, atau teks dengan tampilan khusus (mis. sebagian kata memakai font lain). `text` dipakai untuk pembaca layar. */
export type LineContent = string | { text: string; node: ReactNode }

export function Lines({
  lines,
  baseDelay = 0,
  stagger = 90,
  duration = 900,
}: {
  lines: LineContent[]
  baseDelay?: number
  stagger?: number
  duration?: number
}) {
  return (
    <>
      <span className="sr-only">{lines.map((line) => (typeof line === 'string' ? line : line.text)).join(' ')}</span>
      {lines.map((line, index) => (
        <span key={typeof line === 'string' ? line : line.text} className="reveal-line" aria-hidden="true">
          <span
            className="reveal-unit"
            style={{ '--delay': `${baseDelay + index * stagger}ms`, '--dur': `${duration}ms` } as CSSProperties}
          >
            {typeof line === 'string' ? line : line.node}
          </span>
        </span>
      ))}
    </>
  )
}

export function Words({ text, stagger = 22 }: { text: string; stagger?: number }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((word, index) => (
          <span key={`${word}-${index}`} className="reveal-word" style={{ '--delay': `${index * stagger}ms` } as CSSProperties}>
            {word}
            {'\u00A0'}
          </span>
        ))}
      </span>
    </>
  )
}
