import { DataTable, type Column } from '@/components/admin/ui/data-table'
import { Panel } from '@/components/admin/ui/panel'
import { StatusBadge } from '@/components/admin/ui/status-badge'
import { transactionStatusMeta } from '@/data/admin/status-meta'
import { formatRupiahTight } from '@/lib/format'
import type { Transaction } from '@/types/admin'

const columns: Column<Transaction>[] = [
  { key: 'id', header: 'ID', cell: (trx) => <span className="font-semibold text-primary">{trx.id}</span> },
  { key: 'time', header: 'Waktu', cell: (trx) => trx.time },
  { key: 'customer', header: 'Pelanggan', cell: (trx) => `${trx.customer} (${trx.source})` },
  { key: 'service', header: 'Layanan', cell: (trx) => trx.service },
  { key: 'capster', header: 'Capster', cell: (trx) => trx.capster },
  { key: 'total', header: 'Total', cell: (trx) => <span className="font-semibold">{formatRupiahTight(trx.total)}</span> },
  { key: 'method', header: 'Metode', cell: (trx) => trx.method },
  {
    key: 'status',
    header: 'Status',
    cell: (trx) => {
      const meta = transactionStatusMeta[trx.status]
      return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
    },
  },
]

export function RecentTransactionsPanel({ transactions }: { transactions: Transaction[] }) {
  return (
    <Panel
      title="Transaksi terbaru"
      subtitle="Transaksi tercatat hari ini"
      action={{ label: 'Kelola transaksi', href: '/admin/transaksi' }}
    >
      <DataTable columns={columns} rows={transactions} getRowKey={(trx) => trx.id} caption="Transaksi terbaru hari ini" minWidthClass="min-w-[860px]" />
    </Panel>
  )
}
