import { ADMIN_MOCK_DATE, adminUser } from '@/data/admin/admin-shell'

export function AdminTopbar() {
  return (
    <header className="flex items-center justify-between gap-4">
      <p className="text-[15px] font-semibold text-foreground">Pitstop Admin Dashboard</p>
      <div className="flex items-center gap-2.5">
        <p className="hidden text-[13px] text-muted-foreground sm:block">{ADMIN_MOCK_DATE.long}</p>
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{adminUser.initials}</span>
      </div>
    </header>
  )
}
