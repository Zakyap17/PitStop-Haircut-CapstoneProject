'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { setCurrentReservation } from '@/lib/reservation-storage'

const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none'

/** Form pencarian booking (kode + nomor WhatsApp). Jika ketemu, e-tiketnya dibuka. */
export function CheckReservationForm() {
  const router = useRouter()
  const [code, setCode] = useState('')

  // Tautan dari pesan WhatsApp membawa ?kode=PS-1234 supaya pelanggan cukup mengisi nomor WhatsApp-nya.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get('kode')
    if (fromLink) setCode(fromLink.toUpperCase().slice(0, 12))
  }, [])
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setChecking(true)
    setMessage(null)
    try {
      const reservation = await api.lookupReservation(code, phone.trim())
      setCurrentReservation(reservation)
      router.push('/e-ticket')
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Booking gagal dicari. Coba lagi.')
      setChecking(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 surface-paper rounded-2xl p-6 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.7)] sm:p-8">
      <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        Kode booking
        <input
          required
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase())
            setMessage(null)
          }}
          autoComplete="off"
          placeholder="PS-4821"
          aria-describedby="code-hint"
          className={`${inputClass} font-mono tracking-widest`}
        />
        <span id="code-hint">Kode ada di e-tiket, formatnya PS- diikuti 4 angka.</span>
      </label>

      <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        Nomor WhatsApp saat booking
        <input
          required
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            setMessage(null)
          }}
          autoComplete="tel"
          placeholder="081234567890"
          className={inputClass}
        />
      </label>

      {message && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-relaxed">
          {message}
        </p>
      )}

      <Button type="submit" size="pill" className="w-full" disabled={checking}>
        <Search className="size-4" aria-hidden="true" />
        {checking ? 'Mencari…' : 'Cek Booking'}
      </Button>
    </form>
  )
}
