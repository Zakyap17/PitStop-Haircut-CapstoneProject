'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { findReservation, setCurrentReservation } from '@/lib/reservation-storage'

const inputClass =
  'w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none'

/** Form pencarian reservasi (kode + email). Jika ketemu, e-tiketnya dibuka. */
export function CheckReservationForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [notFound, setNotFound] = useState(false)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const reservation = findReservation(code, email)
    if (!reservation) {
      setNotFound(true)
      return
    }
    setCurrentReservation(reservation)
    router.push('/e-ticket')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-foreground/10 bg-card/80 p-6 backdrop-blur sm:p-8">
      <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        Kode reservasi
        <input
          required
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase())
            setNotFound(false)
          }}
          autoComplete="off"
          placeholder="PS-4821"
          aria-describedby="code-hint"
          className={`${inputClass} font-mono tracking-widest`}
        />
        <span id="code-hint">Kode ada di e-tiket, formatnya PS- diikuti 4 angka.</span>
      </label>

      <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        Email saat reservasi
        <input
          required
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setNotFound(false)
          }}
          autoComplete="email"
          placeholder="nama@email.com"
          className={inputClass}
        />
      </label>

      {notFound && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-relaxed">
          Reservasi tidak ditemukan. Periksa lagi kode dan emailnya. Pencarian saat ini hanya mencakup reservasi yang dibuat di perangkat ini.
        </p>
      )}

      <Button type="submit" size="pill" className="w-full">
        <Search className="size-4" aria-hidden="true" />
        Cek Reservasi
      </Button>
    </form>
  )
}
