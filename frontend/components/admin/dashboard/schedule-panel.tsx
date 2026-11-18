import { DataTable, type Column } from '@/components/admin/ui/data-table'
import { Panel } from '@/components/admin/ui/panel'
import { StatusBadge } from '@/components/admin/ui/status-badge'
import { scheduleStatusMeta } from '@/data/admin/status-meta'
import type { ScheduleItem } from '@/types/admin'

const columns: Column<ScheduleItem>[] = [
  { key: 'time', header: 'Waktu', className: 'w-[90px]', cell: (item) => <span className="font-semibold">{item.time}</span> },
  { key: 'customer', header: 'Pelanggan', cell: (item) => item.customer },
  { key: 'service', header: 'Layanan', cell: (item) => item.service },
  { key: 'capster', header: 'Capster', cell: (item) => item.capster },
  {
    key: 'status',
    header: 'Status',
    cell: (item) => {
      const meta = scheduleStatusMeta[item.status]
      return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
    },
  },
]

export function SchedulePanel({ items }: { items: ScheduleItem[] }) {
  return (
    <Panel
      title="Jadwal layanan hari ini"
      subtitle={`${items.length} layanan mendatang`}
      action={{ label: 'Lihat semua', href: '/admin/jadwal' }}
    >
      <DataTable columns={columns} rows={items} getRowKey={(item) => `${item.time}-${item.customer}`} caption="Jadwal layanan hari ini" />
    </Panel>
  )
}
