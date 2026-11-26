'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCatalog } from '@/components/providers/catalog-provider'
import { useScheduleSelection } from '@/hooks/use-schedule-selection'
import { useTryOnChoice } from '@/hooks/use-try-on-choice'
import { api, ApiError } from '@/lib/api'
import { isValidPhone } from '@/lib/phone'
import { setCurrentReservation } from '@/lib/reservation-storage'
import { clearTryOnChoice } from '@/lib/try-on-storage'

/** Kode error OTP: ditampilkan di dalam dialog verifikasi, bukan di ringkasan. */
const OTP_ERRORS = new Set(['otp_required', 'otp_invalid', 'otp_expired', 'otp_attempts', 'otp_cooldown', 'otp_limit', 'whatsapp_failed', 'invalid_phone'])

/** Dialog verifikasi OTP yang sedang terbuka. */
export type OtpState = {
  /** Nomor WhatsApp tersamar yang menerima kode. */
  to: string
  /** Kapan kode baru boleh diminta lagi (ms epoch). */
  resendAt: number
  error: string | null
  /** Sedang meminta kode baru. */
  resending: boolean
}

/** Kode error dari backend yang artinya jadwalnya berubah: data ketersediaan perlu dimuat ulang. */
const SCHEDULE_CONFLICTS = new Set(['slot_taken', 'slot_unavailable', 'date_out_of_range', 'invalid_time'])

/** State dan aturan form reservasi di landing page. Submit membuat reservasi di server lalu membuka halaman e-tiket. */
export function useBookingForm() {
  const router = useRouter()
  const { services, barbers, booking: rules } = useCatalog()
  const tryOnChoice = useTryOnChoice()

  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [otp, setOtp] = useState<OtpState | null>(null)
  const otpRequired = rules.otpRequired === true

  const schedule = useScheduleSelection(serviceId || null)
  const { days, selectDay, setBarberId, selectedDay, time, barberId } = schedule

  const service = services.find((item) => item.id === serviceId) ?? services[0]

  // Halaman Layanan dan Kapster membuka form ini dengan ?layanan=<id> atau ?kapster=<id>. Dibaca sekali
  // setelah hari tersedia, lalu alamatnya dibersihkan supaya muat ulang tidak mengulang pilihan itu.
  const appliedUrlChoice = useRef(false)
  useEffect(() => {
    if (appliedUrlChoice.current || days.length === 0) return
    appliedUrlChoice.current = true

    const params = new URLSearchParams(window.location.search)
    const wantedService = services.find((item) => item.id === params.get('layanan'))
    const wantedBarberKey = params.get('kapster')?.toLowerCase()
    const wantedBarber = barbers.find((item) => item.id === wantedBarberKey || item.name.toLowerCase() === wantedBarberKey)
    if (!wantedService && !wantedBarber) return

    if (wantedService) setServiceId(wantedService.id)
    if (wantedBarber) {
      // Mulai dari hari terdekat saat kapster itu masuk, supaya pilihannya tidak langsung gugur.
      const workingDay = days.findIndex((day) => !wantedBarber.offDays.includes(day.getDay()))
      if (workingDay >= 0) selectDay(workingDay)
      setBarberId(wantedBarber.id)
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }, [days, services, barbers, selectDay, setBarberId])

  const isValid =
    selectedDay !== null &&
    schedule.isoDate !== null &&
    time !== null &&
    barberId !== null &&
    customerName.trim().length > 1 &&
    isValidPhone(customerPhone) &&
    !submitting

  /** Membuat booking di server. `otpCode` wajib kalau OTP aktif. Berhasil = membuka e-tiket. */
  const createNow = async (otpCode?: string) => {
    if (!schedule.isoDate || !time || !barberId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const reservation = await api.createReservation({
        serviceId: service.id,
        barberId,
        date: schedule.isoDate,
        time,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        hairstyle: tryOnChoice?.name,
        otpCode,
      })
      setCurrentReservation(reservation)
      clearTryOnChoice()
      router.push('/e-ticket')
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null
      const message = apiError?.message ?? 'Reservasi gagal dibuat. Coba lagi.'
      if (apiError && OTP_ERRORS.has(apiError.code) && otpCode) {
        // Kode salah atau kedaluwarsa: tetap di dialog supaya bisa dicoba lagi atau minta kode baru.
        setOtp((current) => (current ? { ...current, error: message } : current))
      } else {
        // Jadwal berubah (slot diambil orang lain, dll.): tutup dialog, kodenya tidak hangus.
        setOtp(null)
        setSubmitError(message)
        if (apiError && SCHEDULE_CONFLICTS.has(apiError.code)) schedule.reload()
      }
      setSubmitting(false)
    }
    // Saat berhasil, tombol tetap nonaktif sampai halaman e-tiket terbuka (mencegah klik ganda).
  }

  /** Meminta kode OTP ke WhatsApp. `resend` = dari tombol kirim ulang di dalam dialog. */
  const sendOtp = async (resend = false) => {
    if (resend) setOtp((current) => (current ? { ...current, resending: true, error: null } : current))
    else {
      setSubmitting(true)
      setSubmitError(null)
    }
    try {
      const sent = await api.requestOtp({ phone: customerPhone.trim(), customerName: customerName.trim() })
      setOtp({ to: sent.to, resendAt: Date.now() + sent.resendAfterSeconds * 1000, error: null, resending: false })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Kode gagal dikirim. Coba lagi.'
      if (resend) setOtp((current) => (current ? { ...current, resending: false, error: message } : current))
      else setSubmitError(message)
    } finally {
      if (!resend) setSubmitting(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || !schedule.isoDate || !time || !barberId) return
    // Pemesan harus terbukti pemilik nomornya: kirim kode OTP dulu, booking baru dibuat setelah kodenya benar.
    if (otpRequired) await sendOtp()
    else await createNow()
  }

  return {
    ...schedule,
    otp,
    otpRequired,
    sendOtp,
    /** Memeriksa kode yang diketik pelanggan lalu membuat booking. */
    verifyOtp: (code: string) => createNow(code),
    closeOtp: () => setOtp(null),
    tryOnChoice,
    clearTryOnChoice,
    services,
    service,
    serviceId,
    setServiceId,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    isValid,
    submitting,
    submitError,
    submit,
  }
}

export type BookingForm = ReturnType<typeof useBookingForm>
