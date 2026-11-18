type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  /** Tombol aksi di kanan (mis. "+ Tambah Transaksi"). */
  action?: React.ReactNode
}

/** Kepala halaman admin: eyebrow biru, judul Anton, deskripsi, dan aksi utama. */
export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold tracking-[1.4px] text-primary uppercase">{eyebrow}</p>
        <h1 className="font-display text-[34px] leading-[1.1] tracking-[0.6px] text-foreground uppercase">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
