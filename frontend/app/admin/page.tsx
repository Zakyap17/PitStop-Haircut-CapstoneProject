import Link from 'next/link'
import { OperationsSummaryPanel } from '@/components/admin/dashboard/operations-summary-panel'
import { RecentTransactionsPanel } from '@/components/admin/dashboard/recent-transactions-panel'
import { SchedulePanel } from '@/components/admin/dashboard/schedule-panel'
import { adminButtonVariants } from '@/components/admin/ui/admin-button'
import { MetricCard } from '@/components/admin/ui/metric-card'
import { PageHeader } from '@/components/admin/ui/page-header'
import { ADMIN_MOCK_DATE } from '@/data/admin/admin-shell'
import { dashboardMetrics, operationSummary, recentTransactions, todaySchedule } from '@/data/admin/dashboard'

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Operasional harian · ${ADMIN_MOCK_DATE.eyebrow}`}
        title="Selamat pagi, Admin"
        description="Pantau dan kelola aktivitas barbershop hari ini."
        action={
          <Link href="/admin/transaksi" className={adminButtonVariants()}>
            + Tambah Transaksi
          </Link>
        }
      />

      <section aria-label="Ringkasan hari ini" className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[3fr_1fr]">
        <SchedulePanel items={todaySchedule} />
        <OperationsSummaryPanel items={operationSummary} />
      </div>

      <RecentTransactionsPanel transactions={recentTransactions} />
    </>
  )
}
