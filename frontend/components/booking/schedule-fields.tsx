import { BarberCard } from '@/components/booking/barber-card'
import { addMinutesToTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ANY_BARBER, type ScheduleSelection } from '@/hooks/use-schedule-selection'

/** Gaya chip pilihan (dipakai juga oleh pilihan layanan di form reservasi). */
export const chipClass = (selected: boolean) =>
  cn(
    'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35',
    selected ? 'border-accent bg-accent text-accent-foreground' : 'border-foreground/15 hover:border-foreground/40',
  )

type ScheduleFieldsProps = {
  schedule: ScheduleSelection
  dateLegend: string
  barberLegend: string
}

/** Pilihan tanggal, jam, dan kapster berdasarkan ketersediaan nyata. Dipakai form reservasi baru dan form ubah jadwal. */
export function ScheduleFields({ schedule, dateLegend, barberLegend }: ScheduleFieldsProps) {
  const { availabilityStatus: status } = schedule
  const allFull = status === 'ready' && schedule.timeSlots.every((slot) => schedule.isSlotDisabled(slot))

  return (
    <>
      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-semibold">{dateLegend}</legend>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {schedule.days.map((day, index) => (
            <button
              key={day.toISOString()}
              type="button"
              aria-pressed={schedule.dayIndex === index}
              onClick={() => schedule.selectDay(index)}
              className={cn(chipClass(schedule.dayIndex === index), 'flex min-w-16 flex-col items-center')}
            >
              <span className="text-xs opacity-70">{day.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
              <span className="font-serif text-2xl leading-none">{day.getDate()}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-busy={status === 'loading'}>
          {schedule.timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={schedule.isSlotDisabled(slot)}
              aria-pressed={schedule.time === slot}
              onClick={() => schedule.setTime(slot)}
              className={cn(
                chipClass(schedule.time === slot),
                status === 'loading' && 'animate-pulse',
                // Slot kedua dan seterusnya dari layanan yang lebih dari satu slot: ikut tertahan, jadi diberi warna aksen.
                schedule.coveredTimes.includes(slot) && schedule.time !== slot && 'border-accent/60 bg-accent/20 disabled:opacity-80',
              )}
            >
              {slot}
            </button>
          ))}
        </div>
        <div aria-live="polite" className="mt-2 min-h-5 text-xs text-muted-foreground">
          {status === 'loading' && 'Memuat jam yang tersedia…'}
          {status === 'ready' && !allFull && schedule.slotsNeeded > 1 &&
            (schedule.time && schedule.reservedMinutes
              ? `Layanan ini menahan ${schedule.slotsNeeded} slot: ${schedule.time} sampai ${addMinutesToTime(schedule.time, schedule.reservedMinutes)}.`
              : `Layanan ini memakai ${schedule.slotsNeeded} slot berurutan, jadi hanya jam yang cukup untuk ${schedule.slotsNeeded} slot yang bisa dipilih.`)}
          {allFull && 'Semua jam di hari ini sudah penuh atau lewat. Pilih hari lain.'}
          {status === 'error' && (
            <span role="alert" className="text-destructive">
              {schedule.availabilityError}{' '}
              <button type="button" onClick={schedule.reload} className="underline underline-offset-4">
                Coba lagi
              </button>
            </span>
          )}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-semibold">{barberLegend}</legend>
        {/* Dua kapster atau kurang: dua kolom yang lebar. Lebih dari itu: tiga kolom di layar lebar. */}
        <div className={cn('grid grid-cols-2 gap-3', schedule.barbers.length > 2 && 'sm:grid-cols-3')}>
          <button
            type="button"
            aria-pressed={schedule.barberId === ANY_BARBER}
            onClick={() => schedule.setBarberId(ANY_BARBER)}
            className={cn(chipClass(schedule.barberId === ANY_BARBER), cn('col-span-2 text-left', schedule.barbers.length > 2 && 'sm:col-span-3'))}
          >
            <span className="block">Siapa saja</span>
            <span className="block text-xs opacity-70">Tanpa preferensi, kami pilihkan kapster yang kosong</span>
          </button>
          {schedule.barbers.map((barber) => (
            <BarberCard
              key={barber.id}
              name={barber.name}
              photo={barber.photo}
              state={schedule.barberState(barber)}
              selected={schedule.barberId === barber.id}
              onSelect={() => schedule.setBarberId(barber.id)}
            />
          ))}
        </div>
      </fieldset>
    </>
  )
}
