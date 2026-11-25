import { MessageCircle } from 'lucide-react'
import type { Reservation } from '@/types/reservation'

const TEXT = {
  pending: (to: string) => `Invoice sedang dikirim ke WhatsApp ${to}.`,
  sent: (to: string) => `Invoice sudah dikirim ke WhatsApp ${to}.`,
  failed: (to: string) => `Invoice belum berhasil dikirim ke WhatsApp ${to}. Simpan kode reservasimu atau unduh e-tiketnya.`,
} as const

/** Status pengiriman invoice WhatsApp. Statusnya diperbarui tiap e-tiket dibuka (disegarkan dari server). */
export function InvoiceStatus({ invoice }: { invoice: Reservation['invoice'] }) {
  if (!invoice) return null
  return (
    <p
      role="status"
      className={`flex max-w-[882px] items-center gap-2 text-sm ${invoice.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
      {TEXT[invoice.status](invoice.to)}
    </p>
  )
}
