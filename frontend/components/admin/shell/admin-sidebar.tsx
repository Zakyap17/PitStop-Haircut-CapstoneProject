'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminNavItems, adminUser } from '@/data/admin/admin-shell'
import { cn } from '@/lib/utils'

/** Ikon dari Figma diwarnai lewat CSS mask supaya satu file bisa dipakai untuk status aktif dan tidak aktif. */
function NavIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-[18px] shrink-0 bg-current"
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  )
}

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))
}

/** Sidebar desktop (lebar 240px) dengan menu, badge booking, dan profil admin. */
export function AdminSidebar() {
  const isActive = useIsActive()

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-7 border-r border-border bg-card px-4 py-6 lg:flex">
      <div className="flex items-center gap-2.5">
        <Image src="/images/brand/logo-mark.png" alt="" width={36} height={36} className="size-9 rounded-full" />
        <div className="flex flex-col gap-px">
          <span className="text-[15px] leading-normal font-bold tracking-[1.5px] text-navy">PITSTOP</span>
          <span className="text-[10px] leading-normal font-medium tracking-[1.6px] text-muted-foreground">ADMIN APP</span>
        </div>
      </div>

      <nav aria-label="Menu admin" className="flex flex-col gap-1">
        {adminNavItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors',
                active ? 'bg-soft font-semibold text-primary' : 'font-medium text-muted-foreground hover:bg-soft/60 hover:text-foreground',
              )}
            >
              <NavIcon src={item.icon} />
              <span>{item.label}</span>
              {'badge' in item && item.badge > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 pt-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{adminUser.initials}</span>
        <div className="flex flex-col gap-px">
          <span className="text-[13px] leading-normal font-semibold text-foreground">{adminUser.name}</span>
          <span className="text-xs leading-normal text-muted-foreground">{adminUser.role}</span>
        </div>
      </div>
    </aside>
  )
}

/** Menu horizontal untuk layar kecil, menggantikan sidebar. */
export function AdminMobileNav() {
  const isActive = useIsActive()

  return (
    <nav aria-label="Menu admin" className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
      {adminNavItems.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] whitespace-nowrap',
              active ? 'bg-soft font-semibold text-primary' : 'font-medium text-muted-foreground',
            )}
          >
            <NavIcon src={item.icon} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
