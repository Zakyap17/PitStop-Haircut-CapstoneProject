'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { lenisRef } from '@/lib/intro-store'
import { cn } from '@/lib/utils'

const links = [
  { href: '#cerita', label: 'Cerita' },
  { href: '#portofolio', label: 'Portofolio' },
  { href: '#layanan', label: 'Layanan' },
  { href: '#kapster', label: 'Kapster' },
  { href: '#try-on', label: 'Try-On' },
  { href: '#testimoni', label: 'Testimoni' },
]

/** Navbar kaca: logo di kiri, menu berbentuk pil di tengah (aktif = abu-abu transparan), tombol Reservasi di kanan. */
export function SiteNavbar() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  // Setelah di-scroll, navbar diberi latar blur agar tidak bertumpuk dengan isi halaman di belakangnya.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Menandai section yang sedang tampil di tengah layar.
  useEffect(() => {
    const sections = links.map((link) => document.querySelector(link.href)).filter((el): el is Element => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(`#${entry.target.id}`)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    const hero = document.querySelector('#beranda')
    const heroObserver = new IntersectionObserver(([entry]) => entry.isIntersecting && setActiveId(null), { threshold: 0.4 })
    if (hero) heroObserver.observe(hero)
    return () => {
      observer.disconnect()
      heroObserver.disconnect()
    }
  }, [])

  const toggle = (next: boolean) => {
    setOpen(next)
    if (next) lenisRef.current?.stop()
    else lenisRef.current?.start()
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Navigasi utama"
        className={cn(
          'pointer-events-auto relative z-[60] flex items-center justify-between gap-4 px-[4%] transition-all duration-300',
          scrolled ? 'border-b border-white/10 bg-background/80 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl' : 'py-6',
        )}
      >
        <a href="#beranda" className="flex items-center gap-2.5" onClick={() => open && toggle(false)}>
          <Image src="/images/brand/logo-mark.png" alt="" width={36} height={36} className="size-9 rounded-full ring-1 ring-white/30" />
          <span className="font-script text-xl text-white">Pit Stop</span>
        </a>

        <ul className="hidden items-center gap-1 rounded-full border border-white/20 bg-white/[0.08] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-xl lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={activeId === link.href ? 'true' : undefined}
                className={cn(
                  'block rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-300',
                  activeId === link.href ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#reservasi"
            className="rounded-full bg-black/45 px-7 py-3 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-black/70"
          >
            Reservasi
          </a>
          <button
            type="button"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => toggle(!open)}
            className="flex size-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          >
            <span className={cn('h-0.5 w-6 bg-white transition-transform', open && 'translate-y-2 rotate-45')} />
            <span className={cn('h-0.5 w-6 bg-white transition-opacity', open && 'opacity-0')} />
            <span className={cn('h-0.5 w-6 bg-white transition-transform', open && '-translate-y-2 -rotate-45')} />
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
              className={cn('transition-all duration-[420ms] ease-out', open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0')}
              style={{ transitionDelay: open ? `${120 + index * 60}ms` : '0ms' }}
            >
              <a
                href={link.href}
                tabIndex={open ? 0 : -1}
                onClick={() => toggle(false)}
                className="font-display text-5xl leading-none tracking-tight uppercase transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="checker-strip absolute inset-x-0 bottom-0 h-8" aria-hidden="true" />
      </div>
    </header>
  )
}
