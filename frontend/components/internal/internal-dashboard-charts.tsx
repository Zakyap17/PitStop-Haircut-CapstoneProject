'use client'

import { useEffect, useMemo, useState } from 'react'
import { internalApi, type InternalUser } from '@/lib/internal-api'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
type ChartRow = { bucket_start: string; revenue?: number | string; expenses?: number | string; earnings?: number | string }
type ChartPayload = { role: 'owner' | 'capster'; period: Period; series: ChartRow[] }

const periods: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Harian · 7 hari' },
  { value: 'weekly', label: 'Mingguan · 8 minggu' },
  { value: 'monthly', label: 'Bulanan · 12 bulan' },
  { value: 'yearly', label: 'Tahunan · 5 tahun' },
]
const amount = (value: unknown) => Number(value || 0)
const currency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const compactCurrency = (value: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

function periodLabel(value: string, period: Period) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  if (period === 'yearly') return String(date.getFullYear())
  if (period === 'monthly') return new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(date)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date)
}

function BarChart({ rows, period, capster = false }: { rows: ChartRow[]; period: Period; capster?: boolean }) {
  const max = Math.max(1, ...rows.flatMap((row) => capster ? [amount(row.earnings)] : [amount(row.revenue), amount(row.expenses)]))
  const left = 28
  const plotWidth = 664
  const plotHeight = 166
  const baseline = 202
  const groupWidth = plotWidth / Math.max(rows.length, 1)
  const barWidth = Math.min(capster ? 34 : 20, groupWidth * (capster ? 0.56 : 0.28))
  const bar = (index: number, value: number, seriesIndex: number, color: string, title: string) => {
    const height = (value / max) * plotHeight
    const x = left + index * groupWidth + groupWidth / 2 + (capster ? 0 : (seriesIndex === 0 ? -barWidth : 0))
    const y = baseline - height
    return <rect key={`${index}-${seriesIndex}`} x={x} y={y} width={barWidth - 3} height={height} rx="4" fill={color}><title>{title}: {currency(value)}</title></rect>
  }

  return (
    <svg viewBox="0 0 720 250" role="img" aria-label={capster ? 'Grafik batang pendapatan capster' : 'Grafik batang pendapatan dan pengeluaran owner'} className="h-64 w-full overflow-visible">
      {[0, 1, 2, 3].map((line) => <line key={line} x1={left} x2={left + plotWidth} y1={baseline - line * (plotHeight / 3)} y2={baseline - line * (plotHeight / 3)} stroke="currentColor" className="text-border" strokeDasharray={line ? '3 5' : undefined} />)}
      {rows.map((row, index) => <g key={row.bucket_start}>
        {capster
          ? bar(index, amount(row.earnings), 0, '#2563eb', `${periodLabel(row.bucket_start, period)} · Pendapatan`)
          : <>{bar(index, amount(row.revenue), 0, '#2563eb', `${periodLabel(row.bucket_start, period)} · Pendapatan`)}{bar(index, amount(row.expenses), 1, '#f97316', `${periodLabel(row.bucket_start, period)} · Pengeluaran`)}</>}
        <text x={left + index * groupWidth + groupWidth / 2} y="229" textAnchor="middle" className="fill-muted-foreground" fontSize="10">{periodLabel(row.bucket_start, period)}</text>
      </g>)}
    </svg>
  )
}

function OwnerDoughnut({ revenue, expenses }: { revenue: number; expenses: number }) {
  const radius = 55
  const circumference = 2 * Math.PI * radius
  const total = revenue + expenses
  const revenueArc = total ? (revenue / total) * circumference : 0
  const expenseArc = total ? (expenses / total) * circumference : 0
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 140 140" role="img" aria-label={`Doughnut pendapatan ${currency(revenue)} dan pengeluaran ${currency(expenses)}`} className="h-40 w-40 shrink-0">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="20" className="text-muted/30" />
        {total > 0 && <>
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#2563eb" strokeWidth="20" strokeDasharray={`${revenueArc} ${circumference - revenueArc}`} transform="rotate(-90 70 70)" />
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#f97316" strokeWidth="20" strokeDasharray={`${expenseArc} ${circumference - expenseArc}`} strokeDashoffset={-revenueArc} transform="rotate(-90 70 70)" />
        </>}
        <text x="70" y="67" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">Total</text>
        <text x="70" y="83" textAnchor="middle" className="fill-foreground" fontSize="10">{compactCurrency(total)}</text>
      </svg>
      <div className="space-y-4 text-sm">
        <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />Pendapatan<br /><strong className="ml-5">{currency(revenue)}</strong></p>
        <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />Pengeluaran<br /><strong className="ml-5">{currency(expenses)}</strong></p>
      </div>
    </div>
  )
}

export function InternalDashboardCharts({ role }: { role: InternalUser['role'] }) {
  const [period, setPeriod] = useState<Period>('daily')
  const [data, setData] = useState<ChartPayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    internalApi<ChartPayload>(`/api/internal/dashboard/charts?period=${period}`)
      .then((result) => { if (active) setData(result) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Grafik gagal dimuat.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  const totals = useMemo(() => (data?.series || []).reduce((sum, row) => ({
    revenue: sum.revenue + amount(row.revenue),
    expenses: sum.expenses + amount(row.expenses),
  }), { revenue: 0, expenses: 0 }), [data])

  if (role !== 'owner' && role !== 'capster') return null
  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">{role === 'owner' ? 'Pendapatan & pengeluaran' : 'Pendapatan pribadi'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{role === 'owner' ? 'Ringkasan keuangan dari transaksi dan pengeluaran tersimpan.' : 'Estimasi dari layanan yang sudah diselesaikan.'}</p>
        </div>
        <label className="text-sm font-medium">Periode<select aria-label="Pilih periode grafik" value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="ml-2 rounded-lg border border-input bg-background px-3 py-2">
          {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Memuat data grafik…</p>}
      {!loading && data && <div className={role === 'owner' ? 'grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)]' : ''}>
        <div>
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-blue-600" />{role === 'owner' ? 'Pendapatan' : 'Pendapatan pribadi'}</span>
            {role === 'owner' && <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-orange-500" />Pengeluaran</span>}
          </div>
          <BarChart rows={data.series} period={period} capster={role === 'capster'} />
        </div>
        {role === 'owner' && <div className="border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <h3 className="mb-4 text-center text-sm font-medium">Komposisi periode</h3>
          <OwnerDoughnut revenue={totals.revenue} expenses={totals.expenses} />
        </div>}
      </div>}
      {!loading && data?.series.every((row) => role === 'owner' ? amount(row.revenue) === 0 && amount(row.expenses) === 0 : amount(row.earnings) === 0) && <p className="text-center text-sm text-muted-foreground">Belum ada data pada periode ini.</p>}
    </section>
  )
}
