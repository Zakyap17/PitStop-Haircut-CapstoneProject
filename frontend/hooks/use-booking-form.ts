import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { services } from '@/data/services'
import { useScheduleSelection } from '@/hooks/use-schedule-selection'
import { useTryOnChoice } from '@/hooks/use-try-on-choice'
import { toIsoDate } from '@/lib/format'
import { generateReservationCode, saveReservation } from '@/lib/reservation-storage'
import { clearTryOnChoice } from '@/lib/try-on-storage'

const EMAIL_PATTERN = /\S+@\S+\.\S+/

/** State dan aturan form reservasi di landing page. Submit menyimpan reservasi lalu membuka halaman e-tiket. */
export function useBookingForm() {
  const router = useRouter()
  const tryOnChoice = useTryOnChoice()
  const schedule = useScheduleSelection()
  const { selectedDay, time, barberName } = schedule

  const [serviceId, setServiceId] = useState(services[0].id)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const service = services.find((item) => item.id === serviceId) ?? services[0]

  const isValid =
    selectedDay !== null && time !== null && barberName !== null && customerName.trim().length > 1 && EMAIL_PATTERN.test(customerEmail)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || !selectedDay || !time || !barberName) return

    saveReservation({
      code: generateReservationCode(),
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      date: toIsoDate(selectedDay),
      time,
      barberName,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      price: service.price,
      hairstyle: tryOnChoice?.name,
    })
    clearTryOnChoice()
    router.push('/e-ticket')
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
    isValid,
    submit,
  }
}
