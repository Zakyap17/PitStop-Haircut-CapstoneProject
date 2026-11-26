'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BookingForm } from '@/hooks/use-booking-form'

/**
 * Dialog verifikasi nomor WhatsApp: pelanggan memasukkan kode 6 digit yang dikirim ke WhatsApp-nya sebelum booking dibuat.
 * Memakai elemen <dialog> bawaan browser (fokus terkunci di dalamnya, Esc menutup). Salah kode tetap di dialog supaya bisa dicoba lagi.
 */
export function OtpDialog({ form }: { form: BookingForm }) {
  const { otp } = form
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [now, setNow] = useState(() => Date.now())

  // Buka atau tutup dialog mengikuti state form.
  const isOpen = otp !== null
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) {
      setCode('')
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  // Setelah kode salah: kosongkan isian dan kembalikan fokus supaya langsung bisa mengetik ulang.
  const error = otp?.error ?? null
  useEffect(() => {
    if (!error) return
    setCode('')
    inputRef.current?.focus()
  }, [error])

  // Hitung mundur tombol kirim ulang.
  const resendAt = otp?.resendAt ?? 0
  useEffect(() => {
    if (!isOpen) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isOpen, resendAt])
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (code.length === 6 && !form.submitting) void form.verifyOtp(code)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="otp-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!form.submitting) form.closeOtp()
      }}
      className="m-auto w-[min(92vw,440px)] surface-paper rounded-2xl p-0 backdrop:bg-black/70"
    >
      <form onSubmit={submit} className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h2 id="otp-title" className="font-display text-2xl tracking-[0.02em] uppercase">
              Verifikasi WhatsApp
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Kami mengirim kode 6 digit ke <span className="font-semibold text-foreground">{otp?.to}</span>. Masukkan kode itu untuk memastikan kamu pemilik nomornya.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Kode verifikasi
          <input
            ref={inputRef}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            aria-describedby={otp?.error ? 'otp-error' : undefined}
            aria-invalid={otp?.error ? true : undefined}
            className="h-14 rounded-lg border border-input bg-background text-center font-display text-3xl tracking-[0.5em] text-foreground tabular-nums placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
          />
        </label>

        {otp?.error && (
          <p id="otp-error" role="alert" className="rounded-lg border border-destructive/40 bg-background px-3.5 py-3 text-sm leading-relaxed">
            {otp.error}
          </p>
        )}

        <Button type="submit" size="pill" disabled={code.length !== 6 || form.submitting} className="w-full">
          {form.submitting ? 'Memverifikasi…' : 'Verifikasi dan Pesan'}
        </Button>

        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => void form.sendOtp(true)}
            disabled={waitSeconds > 0 || otp?.resending || form.submitting}
            className="text-accent underline underline-offset-4 hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {otp?.resending ? 'Mengirim…' : waitSeconds > 0 ? `Kirim ulang kode (${waitSeconds} dtk)` : 'Kirim ulang kode'}
          </button>
          <button type="button" onClick={form.closeOtp} disabled={form.submitting} className="text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50">
            Ganti nomor
          </button>
        </div>
      </form>
    </dialog>
  )
}
