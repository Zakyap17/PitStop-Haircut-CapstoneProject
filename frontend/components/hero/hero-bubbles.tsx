'use client'

import { useEffect, useState } from 'react'

type Bubble = { id: number; size: number; left: number; opacity: number; duration: number; delay: number }

const BUBBLE_COUNT = 18

/** Gelembung transparan yang naik terus dari bawah. Dibuat setelah mount supaya acaknya tidak beda antara server dan browser. */
export function HeroBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])

  useEffect(() => {
    setBubbles(
      Array.from({ length: BUBBLE_COUNT }, (_, id) => ({
        id,
        size: Math.random() * 20 + 10,
        left: Math.random() * 100,
        opacity: Math.random() * 0.4 + 0.2,
        duration: Math.random() * 6 + 4,
        // delay negatif: animasi langsung berjalan di titik acak, bukan menunggu giliran
        delay: -Math.random() * 10,
      })),
    )
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {bubbles.map((bubble) => (
        <span
          key={bubble.id}
          className="hero-bubble"
          style={
            {
              width: bubble.size,
              height: bubble.size,
              left: `${bubble.left}%`,
              '--bubble-opacity': bubble.opacity,
              '--bubble-duration': `${bubble.duration}s`,
              '--bubble-delay': `${bubble.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
