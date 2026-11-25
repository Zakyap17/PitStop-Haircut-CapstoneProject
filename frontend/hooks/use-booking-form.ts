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

const EMAIL_PATTERN = /\S+@\S+\.\S+/

/** Kode error dari backend yang artinya jadwalnya berubah: data ketersediaan perlu dimuat ulang. */
const SCHEDULE_CONFLICTS = new Set(['slot_taken', 'slot_unavailable', 'date_out_of_range', 'invalid_time'])

/** State dan aturan form reservasi di landing page. Submit membuat reservasi di server lalu membuka halaman e-tiket. */
export function useBookingForm() {
  const router = useRouter()
  const { services, barbers } = useCatalog()
  const tryOnChoice = useTryOnChoice()

  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
    EMAIL_PATTERN.test(customerEmail) &&
    isValidPhone(customerPhone) &&
    !submitting

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || !schedule.isoDate || !time || !barberId) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const reservation = await api.createReservation({
        serviceId: service.id,
        barberId,
        date: schedule.isoDate,
        time,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        hairstyle: tryOnChoice?.name,
      })
      setCurrentReservation(reservation)
      clearTryOnChoice()
      router.push('/e-ticket')
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null
      setSubmitError(apiError?.message ?? 'Reservasi gagal dibuat. Coba lagi.')
      if (apiError && SCHEDULE_CONFLICTS.has(apiError.code)) schedule.reload()
      setSubmitting(false)
    }
    // Saat berhasil, tombol tetap nonaktif sampai halaman e-tiket terbuka (mencegah klik ganda).
  }

  return {
    ...schedule,
    tryOnChoice,
    clearTryOnChoice,
    services,
    service,
    serviceId,
    setServiceId,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    isValid,
    submitting,
    submitError,
    submit,
  }
}
