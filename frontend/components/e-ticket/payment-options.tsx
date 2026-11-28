'use client'

import { useEffect, useState } from 'react'
import { Landmark, Loader2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, ApiError, type PaymentConfig } from '@/lib/api'
import { formatRupiah } from '@/lib/format'
import type { Reservation } from '@/types/reservation'

/** Kartu pilihan di dalam panel DP: putih hangat solid dengan garis tipis, tanpa transparansi. */
const card = 'flex flex-col gap-3 rounded-xl border border-[#e6d6a3] bg-[#fffdf8] p-4 sm:p-5'
const cardTitle = 'flex items-center gap-2 text-[15px] font-semibold'

type Props = {
  reservation: Reservation
  /** Dipanggil kalau pengecekan status mengubah booking (mis. DP sudah dibayar), supaya halaman memuat ulang tampilannya. */
  onUpdated: (reservation: Reservation) => void
  /** Pelanggan baru kembali dari halaman bayar Midtrans: 'checking' = sedang dicek, 'still-waiting' = belum terdeteksi. */
  returning: 'idle' | 'checking' | 'still-waiting'
}

/**
 * Menu "Pilih pembayaran" untuk DP: bayar online (Midtrans: QRIS, virtual account, e-wallet; terkonfirmasi otomatis) atau
 * transfer manual (dikonfirmasi admin). Kalau backend belum mengaktifkan pembayaran online, hanya transfer manual yang tampil.
 */
export function PaymentOptions({ reservation, onUpdated, returning }: Props) {
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [paying, setPaying] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getPaymentConfig()
      .then((result) => !cancelled && setConfig(result))
      .catch(() => !cancelled && setConfig({ online: false, provider: null, sandbox: null }))
    return () => {
      cancelled = true
    }
  }, [])

  const online = config?.online === true

  const payOnline = async () => {
    setPaying(true)
    setError(null)
    setNotice(null)
    try {
      const { redirectUrl } = await api.startPayment(reservation.code, reservation.customerPhone)
      // Halaman bayar Midtrans dibuka di tab yang sama; setelah selesai pelanggan dikembalikan ke e-tiket ini.
      window.location.assign(redirectUrl)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Pembayaran online belum bisa dimulai. Coba lagi atau bayar lewat transfer manual.')
      setPaying(false)
    }
  }

  const checkStatus = async () => {
    setChecking(true)
    setError(null)
    setNotice(null)
    try {
      const { reservation: fresh } = await api.syncPayment(reservation.code, reservation.customerPhone)
      if (fresh.dp.status === 'dibayar') onUpdated(fresh)
      else setNotice('Pembayaranmu belum kami terima. Kalau baru saja membayar, tunggu sebentar lalu cek lagi.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Status pembayaran belum bisa dicek. Coba lagi sebentar lagi.')
    } finally {
      setChecking(false)
    }
  }

  const manual = (
    <div className={card}>
      <h3 className={cardTitle}>
        <Landmark className="size-4 text-ink-muted" aria-hidden="true" />
        Transfer manual
      </h3>
      <p className="text-[15px] leading-snug font-semibold">{reservation.dp.instruction ?? 'Hubungi kasir untuk cara bayarnya.'}</p>
      <p className="text-xs leading-relaxed text-ink-muted">Setelah dikonfirmasi admin, bukti booking dikirim ke WhatsApp.</p>
    </div>
  )

  return (
    <div className="border-t border-[#efdfae] px-5 py-5 sm:px-6">
      <h3 className="text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">Pilih pembayaran</h3>

      <div className={online ? 'mt-3 grid gap-3 md:grid-cols-2' : 'mt-3'}>
        {online && (
          <div className={card}>
            <h3 className={cardTitle}>
              <QrCode className="size-4 text-primary" aria-hidden="true" />
              Bayar online
              {config?.sandbox && <span className="rounded-full border border-amber-700/40 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-amber-900 uppercase">Mode uji</span>}
            </h3>
            <p className="text-sm leading-relaxed text-ink-muted">QRIS, virtual account, atau e-wallet. DP langsung terkonfirmasi otomatis dan bukti booking dikirim ke WhatsApp.</p>
            <Button size="pill" onClick={payOnline} disabled={paying || checking} className="mt-auto w-full sm:w-auto">
              {paying ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Menyiapkan pembayaran…
                </>
              ) : (
                `Bayar ${formatRupiah(reservation.dp.nominal)}`
              )}
            </Button>
            {config?.sandbox && <p className="text-xs leading-relaxed text-ink-muted">Mode uji: tidak ada uang sungguhan yang dipakai.</p>}
          </div>
        )}
        {manual}
      </div>

      <div aria-live="polite" className="mt-3 text-sm leading-relaxed">
        {returning === 'checking' && (
          <p className="flex items-center gap-2 font-medium text-ink">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Memeriksa pembayaranmu…
          </p>
        )}
        {returning === 'still-waiting' && !notice && <p className="font-medium text-amber-900">Pembayaranmu belum terdeteksi. Kalau sudah membayar, tunggu sebentar lalu tekan “Cek status pembayaran”.</p>}
        {notice && <p className="font-medium text-amber-900">{notice}</p>}
        {error && (
          <p role="alert" className="font-medium text-red-800">
            {error}
          </p>
        )}
      </div>

      {online && (
        <button
          type="button"
          onClick={checkStatus}
          disabled={checking || paying}
          className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink disabled:opacity-60"
        >
          {checking && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Sudah bayar? Cek status pembayaran
        </button>
      )}
    </div>
  )
}
