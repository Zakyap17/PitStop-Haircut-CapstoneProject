import { cn } from '@/lib/utils'
import type { ScheduleSelection } from '@/hooks/use-schedule-selection'

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

/** Pilihan tanggal, jam, dan kapster. Dipakai form reservasi baru dan form ubah jadwal. */
export function ScheduleFields({ schedule, dateLegend, barberLegend }: ScheduleFieldsProps) {
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
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {schedule.timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={schedule.isSlotDisabled(slot)}
              aria-pressed={schedule.time === slot}
              onClick={() => schedule.setTime(slot)}
              className={chipClass(schedule.time === slot)}
            >
              {slot}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-semibold">{barberLegend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {schedule.barbers.map((barber) => {
            const available = !schedule.isBarberOff(barber.offDays)
            return (
              <button
                key={barber.name}
                type="button"
                disabled={!available}
                aria-pressed={schedule.barberName === barber.name}
                onClick={() => schedule.setBarberName(barber.name)}
                className={cn(chipClass(schedule.barberName === barber.name), 'text-left')}
              >
                <span className="block">{barber.name}</span>
                <span className="block text-xs opacity-70">{available ? 'Tersedia' : 'Libur'}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
    </>
  )
}
