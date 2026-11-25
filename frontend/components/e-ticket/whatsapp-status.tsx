import { MessageCircle } from 'lucide-react'
import type { Reservation } from '@/types/reservation'

const TEXT = {
  pending: (to: string) => `Pesan WhatsApp sedang dikirim ke ${to}.`,
  sent: (to: string) => `Pesan WhatsApp sudah dikirim ke ${to}.`,
  failed: (to: string) => `Pesan WhatsApp belum berhasil dikirim ke ${to}. Simpan kode bookingmu atau unduh e-tiketnya.`,
} as const

/** Status pesan WhatsApp terakhir (instruksi DP, bukti booking, dst.). Diperbarui tiap e-tiket dibuka. */
export function WhatsappStatus({ whatsapp }: { whatsapp: Reservation['whatsapp'] }) {
  if (!whatsapp) return null
  return (
    <p role="status" className={`flex max-w-[882px] items-center gap-2 text-sm ${whatsapp.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
      <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
      {TEXT[whatsapp.status](whatsapp.to)}
    </p>
  )
}
