'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export const pageLinks = [
  { href: '/layanan', label: 'Layanan' },
  { href: '/kapster', label: 'Kapster' },
  { href: '/galeri', label: 'Galeri' },
]

/** Menu antar halaman. Halaman yang sedang dibuka ditandai (aria-current) dan berwarna abu-abu transparan. */
export function PageNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Halaman" className="-mx-1 flex gap-1 overflow-x-auto px-1 py-1">
      {pageLinks.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active ? 'bg-white/20 text-white' : 'text-muted-foreground hover:bg-white/10 hover:text-white',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
