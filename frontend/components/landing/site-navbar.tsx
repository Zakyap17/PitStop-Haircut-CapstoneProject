'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { BrandLogo } from '@/components/shared/brand-logo'
import { buttonVariants } from '@/components/ui/button'
import { navLinks } from '@/data/site-content'
import { lenisRef } from '@/lib/intro-store'
import { cn } from '@/lib/utils'

export function SiteNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Scroll halaman dikunci selama menu mobile terbuka.
  const setMenu = (open: boolean) => {
    setMenuOpen(open)
    if (open) lenisRef.current?.stop()
    else lenisRef.current?.start()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <nav aria-label="Navigasi utama" className="relative z-10 flex items-center justify-between gap-4 px-6 py-[18px] md:px-12 lg:px-16">
        <BrandLogo href="/" />

        <ul className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="group relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
                <span aria-hidden="true" className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link href="/#reservasi" className={cn(buttonVariants({ size: 'pill' }), 'hidden sm:inline-flex')}>
            Reservasi
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenu(!menuOpen)}
            className="flex size-10 items-center justify-center rounded-full text-foreground lg:hidden"
          >
            {menuOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Menu mobile: panel penuh di bawah navbar, item muncul berurutan. */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={cn(
          'absolute inset-x-0 top-full flex h-[calc(100svh-5rem)] flex-col justify-between bg-background px-6 pt-6 pb-8 transition-opacity duration-[450ms] ease-out lg:hidden',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <ul className="flex flex-col gap-2">
          {navLinks.map((link, index) => (
            <li
              key={link.href}
              className={cn('transition-all duration-[420ms] ease-out', menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0')}
              style={{ transitionDelay: menuOpen ? `${120 + index * 60}ms` : '0ms' }}
            >
              <a
                href={link.href}
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => setMenu(false)}
                className="block font-display text-5xl leading-[1.15] tracking-tight text-foreground uppercase transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/#reservasi"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenu(false)}
          className={cn(buttonVariants({ size: 'pill' }), 'w-full')}
        >
          Reservasi
        </Link>
      </div>
    </header>
  )
}
