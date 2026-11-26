'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { internalApi, type InternalUser } from '@/lib/internal-api'

type Payload = {
  role: InternalUser['role'];
  metrics: Record<string, unknown>;
  schedule?: Record<string, unknown>[];
  recentTransactions?: Record<string, unknown>[];
  capsterPerformance?: Record<string, unknown>[];
}
const money = (value: unknown) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const text = (value: unknown) => value == null ? '—' : String(value)

export function InternalDashboard({ role }: { role: InternalUser['role'] }) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { internalApi<Payload>('/api/internal/dashboard').then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'Data gagal dimuat.')) }, [])
  const metrics = data?.metrics || {}
  const cards: [string, unknown][] = []
  if (role === 'capster') cards.push(['Booking hari ini',metrics.today_count],['Layanan selesai hari ini',metrics.completed_count],['Estimasi pendapatan',money(metrics.earnings)])
  else {
    cards.push(['Booking hari ini',metrics.bookings_today],['Transaksi hari ini',metrics.transactions_today],['Pendapatan hari ini',money(metrics.revenue_today)])
    if (role === 'owner') cards.push(['Pengeluaran hari ini',money(metrics.expenseToday)],['Selisih harian',money(metrics.netToday)],['Jumlah customer',metrics.customer_count])
    else cards.push(['Menunggu konfirmasi',metrics.awaiting_confirmation])
  }
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Ringkasan</p><h1 className="mt-1 text-3xl font-bold">{role === 'owner' ? 'Dashboard Owner' : role === 'capster' ? 'Dashboard Capster' : 'Dashboard Operasional'}</h1><p className="mt-2 text-sm text-muted-foreground">Data operasional dari database.</p></div>{role !== 'capster' && <Link href="/admin/transactions" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Catat walk-in</Link>}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!data && !error && <p className="text-sm text-muted-foreground">Memuat dashboard…</p>}
    {data && <>
      <section className={`grid gap-3 sm:grid-cols-2 ${role === 'owner' ? 'xl:grid-cols-3 2xl:grid-cols-6' : 'xl:grid-cols-4'}`}>{cards.map(([label,value]) => <article key={String(label)} className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{text(value)}</p></article>)}</section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-5"><h2 className="font-semibold">{role === 'capster' ? 'Jadwal saya' : 'Jadwal hari ini'}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-background text-xs text-muted-foreground"><tr>{(role === 'capster' ? ['Jam','Pelanggan','Layanan','Status'] : ['Jam','Tanggal','Pelanggan','Layanan','Capster','Status']).map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{(data.schedule || []).map((row,index) => <tr key={text(row.id_booking ?? row.id_transaksi ?? index)} className="border-t border-border">{(role === 'capster' ? ['jam_mulai','nama_customer','layanan','status_booking'] : ['jam_mulai','tanggal_booking','nama_customer','layanan','nama_capster','status_booking']).map((key) => <td key={key} className="px-4 py-3">{text(row[key])}</td>)}</tr>)}</tbody></table>{!data.schedule?.length && <p className="p-5 text-sm text-muted-foreground">Belum ada jadwal.</p>}</div></div>
        {role === 'capster' ? <div className="rounded-xl border border-border bg-card p-5"><h2 className="mb-3 font-semibold">Akses cepat</h2><div className="flex flex-col gap-2"><Link className="text-sm text-primary hover:underline" href="/capster/schedule">Kelola status layanan →</Link><Link className="text-sm text-primary hover:underline" href="/capster/history">Lihat riwayat pelayanan →</Link><Link className="text-sm text-primary hover:underline" href="/capster/earnings">Lihat rekap pendapatan →</Link></div></div> : <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-5"><h2 className="font-semibold">Transaksi terbaru</h2></div><ul className="divide-y divide-border">{(data.recentTransactions || []).map((row) => <li key={text(row.id_transaksi)} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-semibold">{text(row.kode_transaksi)}</p><p className="text-xs text-muted-foreground">{text(row.jenis_transaksi)} · {text(row.status_transaksi)}</p></div><p className="text-sm font-semibold">{money(row.total_dibayar)}</p></li>)}</ul><Link href="/admin/transactions" className="block p-4 text-sm font-medium text-primary">Buka transaksi →</Link></div>}
      </section>
      {role === 'owner' && <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-5"><h2 className="font-semibold">Performa capster hari ini</h2></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{(data.capsterPerformance || []).map((person) => <article key={text(person.id_capster)} className="rounded-lg border border-border p-4"><p className="font-semibold">{text(person.nama_capster)}</p><p className="mt-1 text-xs text-muted-foreground">{text(person.customers)} pelanggan dilayani</p><p className="mt-2 text-sm font-semibold">Estimasi {money(person.earnings)}</p></article>)}</div></section>}
    </>}
  </>
}
