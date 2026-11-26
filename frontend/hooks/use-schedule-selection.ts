'use client'

import { useCallback, useEffect, useState } from 'react'
import { useCatalog } from '@/components/providers/catalog-provider'
import { api, ApiError } from '@/lib/api'
import { buildBookableDays, slotsCovered } from '@/lib/booking-rules'
import { toIsoDate } from '@/lib/format'
import type { Barber } from '@/types/barber'
import type { Availability } from '@/types/catalog'

/** Nilai barberId untuk "tanpa preferensi": server memilihkan capster yang kosong. */
export const ANY_BARBER = 'any'

export type BarberState = 'available' | 'off' | 'busy'

type AvailabilityState = { status: 'idle' | 'loading' | 'ready' | 'error'; data: Availability | null; error: string | null }

/**
 * Pilihan tanggal, jam, dan kapster berdasarkan ketersediaan nyata dari server untuk layanan yang dipilih.
 * Dipakai form reservasi baru dan form ubah jadwal. `serviceId` null = belum tahu layanannya (belum ada data).
 */
export function useScheduleSelection(serviceId: string | null) {
  const { barbers, booking } = useCatalog()

  // Hari dihitung setelah mount supaya tidak mismatch antara server dan browser (zona waktu berbeda).
  const [days, setDays] = useState<Date[]>([])
  useEffect(() => setDays(buildBookableDays(booking.daysAhead)), [booking.daysAhead])

  const [dayIndex, setDayIndex] = useState(0)
  const [time, setTimeState] = useState<string | null>(null)
  const [barberId, setBarberId] = useState<string | null>(null)

  const selectedDay = days[dayIndex] ?? null
  const isoDate = selectedDay ? toIsoDate(selectedDay) : null

  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'idle', data: null, error: null })
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!isoDate || !serviceId) return
    let cancelled = false
    setAvailability((current) => ({ status: 'loading', data: current.data, error: null }))
    api
      .getAvailability(isoDate, serviceId)
      .then((data) => !cancelled && setAvailability({ status: 'ready', data, error: null }))
      .catch((error: unknown) => {
        if (cancelled) return
        setAvailability({ status: 'error', data: null, error: error instanceof ApiError ? error.message : 'Gagal memuat jadwal.' })
      })
    return () => {
      cancelled = true
    }
  }, [isoDate, serviceId, reloadTick])

  const ready = availability.status === 'ready' ? availability.data : null
  const slotFor = (slotTime: string) => ready?.slots.find((slot) => slot.time === slotTime)

  // Pilihan lama dibatalkan kalau sudah tidak tersedia setelah data baru datang (ganti hari, layanan, atau slot baru diambil orang lain).
  useEffect(() => {
    if (!ready) return
    const slot = time ? ready.slots.find((item) => item.time === time) : undefined
    if (time && (!slot || slot.barbers.length === 0)) {
      setTimeState(null)
      return
    }
    // "any" (tanpa preferensi) tetap berlaku selama jamnya masih punya capster kosong.
    if (barberId && barberId !== ANY_BARBER && slot && !slot.barbers.includes(barberId)) setBarberId(null)
  }, [ready, time, barberId])

  const barberState = (barber: Barber): BarberState => {
    if (selectedDay && barber.offDays.includes(selectedDay.getDay())) return 'off'
    // Tidak punya satu pun jam kosong di hari ini (libur per tanggal atau penuh seharian): tampil tidak tersedia sejak awal.
    if (ready && !ready.slots.some((slot) => slot.barbers.includes(barber.id))) return 'busy'
    const slot = time ? slotFor(time) : undefined
    if (ready && slot && !slot.barbers.includes(barber.id)) return 'busy'
    return 'available'
  }

  const isSlotDisabled = (slotTime: string) => {
    const slot = slotFor(slotTime)
    return !slot || slot.barbers.length === 0
  }

  const selectDay = (index: number) => setDayIndex(index)

  const setTime = (nextTime: string) => {
    setTimeState(nextTime)
    // Kapster yang sudah dipilih tapi tidak kosong di jam baru dilepas.
    const slot = slotFor(nextTime)
    if (barberId && barberId !== ANY_BARBER && slot && !slot.barbers.includes(barberId)) setBarberId(null)
  }

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), [])

  // Layanan yang lebih dari satu slot menahan jam-jam berikutnya juga; jam-jam itu ditandai di pilihan jam.
  const slotsNeeded = ready?.slotsNeeded ?? 1
  const reservedMinutes = ready?.reservedMinutes ?? null
  const coveredTimes = time && slotsNeeded > 1 ? slotsCovered(time, slotsNeeded, booking.timeSlots) : []

  return {
    days,
    dayIndex,
    selectDay,
    selectedDay,
    isoDate,
    time,
    setTime,
    barberId,
    setBarberId,
    barbers,
    timeSlots: booking.timeSlots,
    slotsNeeded,
    reservedMinutes,
    coveredTimes,
    availabilityStatus: availability.status,
    availabilityError: availability.error,
    reload,
    isSlotDisabled,
    barberState,
  }
}

export type ScheduleSelection = ReturnType<typeof useScheduleSelection>
