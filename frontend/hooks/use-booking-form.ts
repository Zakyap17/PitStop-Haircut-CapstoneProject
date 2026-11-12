'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { barbers } from '@/data/barbers'
import { BOOKING_DAYS_AHEAD, timeSlots } from '@/data/booking-slots'
import { services } from '@/data/services'
import { formatDayChip, toIsoDate } from '@/lib/format'
import { generateReservationCode, saveReservation } from '@/lib/reservation-storage'

const EMAIL_PATTERN = /\S+@\S+\.\S+/

/** Hari yang bisa dipesan, mulai dari hari ini. */
function buildBookableDays(): Date[] {
  const today = new Date()
  return Array.from({ length: BOOKING_DAYS_AHEAD }, (_, offset) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    return day
  })
}

/** Slot hari ini yang jamnya sudah lewat tidak boleh dipilih. */
function isSlotInPast(day: Date, slot: string): boolean {
  const now = new Date()
  const isToday = toIsoDate(day) === toIsoDate(now)
  if (!isToday) return false
  const [hours, minutes] = slot.split(':').map(Number)
  return hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes()
}

/** State dan aturan form reservasi di landing page. Submit menyimpan reservasi lalu membuka halaman e-tiket. */
export function useBookingForm() {
  const router = useRouter()

  // Hari dihitung setelah mount supaya tidak mismatch antara server dan browser (zona waktu berbeda).
  const [days, setDays] = useState<Date[]>([])
  useEffect(() => setDays(buildBookableDays()), [])

  const [serviceId, setServiceId] = useState(services[0].id)
  const [dayIndex, setDayIndex] = useState(0)
  const [time, setTime] = useState<string | null>(null)
  const [barberName, setBarberName] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const service = services.find((item) => item.id === serviceId) ?? services[0]
  const selectedDay = days[dayIndex] ?? null
  const isBarberOff = (barberDayOff: number) => selectedDay !== null && selectedDay.getDay() === barberDayOff
  const isSlotDisabled = (slot: string) => selectedDay !== null && isSlotInPast(selectedDay, slot)

  const selectDay = (index: number) => {
    setDayIndex(index)
    const day = days[index]
    // Pilihan lama dibatalkan kalau tidak valid lagi di hari baru.
    if (time && day && isSlotInPast(day, time)) setTime(null)
    const barber = barbers.find((item) => item.name === barberName)
    if (barber && day && day.getDay() === barber.dayOff) setBarberName(null)
  }

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
    })
    router.push('/e-ticket')
  }

  return {
    days,
    dayLabel: (day: Date) => formatDayChip(day),
    timeSlots,
    barbers,
    services,
    service,
    serviceId,
    setServiceId,
    dayIndex,
    selectDay,
    selectedDay,
    time,
    setTime,
    barberName,
    setBarberName,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    isBarberOff,
    isSlotDisabled,
    isValid,
    submit,
  }
}
