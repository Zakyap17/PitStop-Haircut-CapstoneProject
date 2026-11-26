'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { internalApi, type InternalUser } from '@/lib/internal-api'

const roleNames = { owner: 'Owner', admin: 'Admin / Kasir', capster: 'Capster' }
const navByRole = {
  admin: [
    ['Dashboard', '/admin'], ['Booking Online', '/admin/bookings'], ['Pembayaran DP', '/admin/payments'],
    ['Transaksi', '/admin/transactions'], ['Pelanggan', '/admin/customers'], ['Layanan', '/admin/services'],
  ],
  owner: [
    ['Dashboard', '/owner'], ['Laporan', '/owner/reports'], ['Pengguna', '/owner/staff'], ['Layanan', '/owner/services'],
    ['Pengeluaran', '/owner/expenses'], ['Galeri', '/owner/gallery'], ['Pengaturan DP', '/owner/dp-settings'], ['Jejak Audit', '/owner/audit'],
    ['Booking', '/admin/bookings'], ['Transaksi', '/admin/transactions'], ['Pelanggan', '/admin/customers'],
  ],
  capster: [
    ['Dashboard', '/capster'], ['Jadwal Saya', '/capster/schedule'], ['Riwayat Layanan', '/capster/history'], ['Pendapatan Saya', '/capster/earnings'],
  ],
} satisfies Record<InternalUser['role'], string[][]>

export function InternalWorkspace({ children, allowed }: { children: ReactNode; allowed: InternalUser['role'][] }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<InternalUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    internalApi<{ user: InternalUser }>('/api/internal/auth/me')
      .then(({ user: current }) => {
        if (!active) return
        setUser(current)
        if (!allowed.includes(current.role)) router.replace(current.role === 'owner' ? '/owner' : current.role === 'capster' ? '/capster' : '/admin')
      })
      .catch(() => { if (active) router.replace('/internal/login') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [allowed, router])

  async function logout() {
    try { await internalApi('/api/internal/auth/logout', { method: 'POST' }) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Logout gagal.') }
    router.replace('/internal/login')
  }

  if (loading || !user || !allowed.includes(user.role)) return <div className="admin-theme flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">Memuat ruang kerja…</div>
  const nav = navByRole[user.role]
  return (
    <div className="admin-theme min-h-svh lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-5 lg:flex lg:flex-col">
        <Link href={user.role === 'capster' ? '/capster' : user.role === 'owner' ? '/owner' : '/admin'} className="mb-7 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">PS</span>
          <span><strong className="block tracking-[.18em]">PITSTOP</strong><small className="text-muted-foreground">INTERNAL SYSTEM</small></span>
        </Link>
        <nav aria-label="Menu internal" className="flex flex-col gap-1">
          {nav.map(([label, href]) => <Link key={href} href={href} className={`rounded-lg px-3 py-2.5 text-sm ${pathname === href ? 'bg-soft font-semibold text-primary' : 'text-muted-foreground hover:bg-soft/70'}`}>{label}</Link>)}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <p className="text-sm font-semibold">{user.name}</p><p className="mb-3 text-xs text-muted-foreground">{roleNames[user.role]}</p>
          <button onClick={logout} className="text-sm text-primary hover:underline">Keluar</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-7 lg:hidden">
          <div className="mb-3 flex items-center justify-between"><strong className="text-sm">PITSTOP · {roleNames[user.role]}</strong><button onClick={logout} className="text-xs text-primary">Keluar</button></div>
          <nav className="flex gap-2 overflow-x-auto">{nav.map(([label, href]) => <Link key={href} href={href} className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs ${pathname === href ? 'bg-soft font-semibold text-primary' : 'text-muted-foreground'}`}>{label}</Link>)}</nav>
        </header>
        <header className="hidden items-center justify-between border-b border-border bg-card px-7 py-4 lg:flex"><p className="text-sm font-semibold">PitStop · {roleNames[user.role]}</p><p className="text-sm text-muted-foreground">{user.name}</p></header>
        {error && <p role="alert" className="mx-4 mt-4 text-sm text-destructive">{error}</p>}
        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  )
}
