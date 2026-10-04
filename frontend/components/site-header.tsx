'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { lenisRef } from '@/lib/intro'
import { cn } from '@/lib/utils'

const links = [
  { href: '#cerita', label: 'Cerita' },
  { href: '#portofolio', label: 'Portofolio' },
  { href: '#layanan', label: 'Layanan' },
  { href: '#kapster', label: 'Kapster' },
  { href: '#try-on', label: 'Try-On' },
  { href: '#testimoni', label: 'Testimoni' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  const toggle = (next: boolean) => {
    setOpen(next)
    if (next) lenisRef.current?.stop()
    else lenisRef.current?.start()
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Navigasi utama"
        className="pointer-events-auto relative z-[60] flex items-center justify-between gap-4 bg-gradient-to-b from-background/80 to-transparent px-4 py-5 md:px-10"
      >
        <a href="#beranda" className="flex items-center gap-3" onClick={() => open && toggle(false)}>
          <Image src="/images/logo.png" alt="" width={40} height={40} className="size-10 rounded-full ring-1 ring-[var(--line-strong)]" />
          <span className="hidden text-[13px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:block">
            Pit Stop Barbershop
          </span>
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative text-[13px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#reservasi"
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
          >
            Reservasi
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => toggle(!open)}
            className="flex size-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          >
            <span className={cn('h-0.5 w-6 bg-foreground transition-transform', open && 'translate-y-2 rotate-45')} />
            <span className={cn('h-0.5 w-6 bg-foreground transition-opacity', open && 'opacity-0')} />
            <span className={cn('h-0.5 w-6 bg-foreground transition-transform', open && '-translate-y-2 -rotate-45')} />
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={cn(
          'fixed inset-0 z-50 flex flex-col justify-center bg-background px-4 transition-opacity duration-[450ms] ease-out md:px-10 lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!open}
      >
        <ul className="flex flex-col gap-2">
          {links.map((link, index) => (
            <li
              key={link.href}
              className={cn(
                'transition-all duration-[420ms] ease-out',
                open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0',
              )}
              style={{ transitionDelay: open ? `${120 + index * 60}ms` : '0ms' }}
            >
              <a
                href={link.href}
                tabIndex={open ? 0 : -1}
                onClick={() => toggle(false)}
                className="font-display text-5xl uppercase leading-none tracking-tight transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="checker-light absolute inset-x-0 bottom-0 h-5 opacity-80 [background-size:20px_20px]" aria-hidden="true" />
      </div>
    </header>
  )
}
