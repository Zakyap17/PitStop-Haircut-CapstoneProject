'use client'

import { useEffect, useState } from 'react'
import { barbers } from '@/data/barbers'
import { timeSlots } from '@/data/booking-slots'
import { buildBookableDays, isSlotInPast } from '@/lib/booking-rules'

/** Pilihan tanggal, jam, dan kapster beserta aturannya. Dipakai form reservasi baru dan form ubah jadwal. */
export function useScheduleSelection() {
  // Hari dihitung setelah mount supaya tidak mismatch antara server dan browser (zona waktu berbeda).
  const [days, setDays] = useState<Date[]>([])
  useEffect(() => setDays(buildBookableDays()), [])

  const [dayIndex, setDayIndex] = useState(0)
  const [time, setTime] = useState<string | null>(null)
  const [barberName, setBarberName] = useState<string | null>(null)

  const selectedDay = days[dayIndex] ?? null
  const isBarberOff = (offDays: number[]) => selectedDay !== null && offDays.includes(selectedDay.getDay())
  const isSlotDisabled = (slot: string) => selectedDay !== null && isSlotInPast(selectedDay, slot)

  const selectDay = (index: number) => {
    setDayIndex(index)
    const day = days[index]
    if (!day) return
    // Pilihan lama dibatalkan kalau tidak valid lagi di hari baru.
    if (time && isSlotInPast(day, time)) setTime(null)
    const barber = barbers.find((item) => item.name === barberName)
    if (barber && barber.offDays.includes(day.getDay())) setBarberName(null)
  }

  return { days, dayIndex, selectDay, selectedDay, time, setTime, barberName, setBarberName, isBarberOff, isSlotDisabled, timeSlots, barbers }
}

export type ScheduleSelection = ReturnType<typeof useScheduleSelection>
