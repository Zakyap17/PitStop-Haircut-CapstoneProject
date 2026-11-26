import { BarberCard } from '@/components/booking/barber-card'
import { addMinutesToTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ANY_BARBER, type ScheduleSelection } from '@/hooks/use-schedule-selection'

type ScheduleFieldsProps = {
  schedule: ScheduleSelection
  /** Judul langkah tanggal dan jam, biasanya <StepLegend />. */
  dateLegend: React.ReactNode
  /** Judul langkah kapster. */
  barberLegend: React.ReactNode
}

/**
 * Pilihan tanggal, jam, dan kapster berdasarkan ketersediaan nyata. Dipakai form reservasi baru dan form ubah jadwal.
 * Garis pembatas ada di pembungkus, bukan di <fieldset>, supaya judul langkah (<legend>) tidak menimpa garisnya.
 */
export function ScheduleFields({ schedule, dateLegend, barberLegend }: ScheduleFieldsProps) {
  const { availabilityStatus: status } = schedule
  const allFull = status === 'ready' && schedule.timeSlots.every((slot) => schedule.isSlotDisabled(slot))
  const anyBarber = schedule.barberId === ANY_BARBER

  return (
    <>
      <div className="border-t border-border pt-8">
        <fieldset className="min-w-0">
          {dateLegend}

          {/* hari: baris tanggal dengan garis bawah aksen pada hari terpilih */}
          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {schedule.days.map((day, index) => {
              const selected = schedule.dayIndex === index
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => schedule.selectDay(index)}
                  className={cn(
                    '-mb-px flex min-w-14 flex-1 flex-col items-center gap-1 border-b-2 px-2 pt-1 pb-3 transition-colors',
                    selected ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="text-[11px] tracking-[0.14em] uppercase">{day.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                  <span className={cn('font-display text-3xl leading-none', selected && 'text-accent')}>{day.getDate()}</span>
                </button>
              )
            })}
          </div>

          {/* jam */}
          <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-busy={status === 'loading'}>
            {schedule.timeSlots.map((slot) => {
              const selected = schedule.time === slot
              const covered = schedule.coveredTimes.includes(slot) && !selected
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={schedule.isSlotDisabled(slot)}
                  aria-pressed={selected}
                  onClick={() => schedule.setTime(slot)}
                  className={cn(
                    'h-11 rounded-lg border text-sm font-medium tabular-nums transition-colors disabled:cursor-not-allowed',
                    selected
                      ? 'border-accent bg-accent text-accent-foreground'
                      : covered
                        ? 'border-accent/60 bg-accent/15'
                        : 'border-border-strong hover:border-foreground/50 disabled:border-dashed disabled:border-border disabled:text-muted-foreground/50 disabled:line-through disabled:hover:border-border',
                    status === 'loading' && 'animate-pulse',
                  )}
                >
                  {slot}
                </button>
              )
            })}
          </div>
          <div aria-live="polite" className="mt-3 min-h-5 text-xs text-muted-foreground">
            {status === 'loading' && 'Memuat jam yang tersedia…'}
            {status === 'ready' &&
              !allFull &&
              schedule.slotsNeeded > 1 &&
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
      </div>

      <div className="border-t border-border pt-8">
        <fieldset className="min-w-0">
          {barberLegend}

          {/* "Siapa saja" selebar kolom, kartu kapster di bawahnya dengan lebar tetap */}
          <button
            type="button"
            aria-pressed={anyBarber}
            onClick={() => schedule.setBarberId(ANY_BARBER)}
            className={cn(
              'mb-4 flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
              anyBarber ? 'border-accent bg-accent/10' : 'border-border-strong hover:border-foreground/50',
            )}
          >
            <span aria-hidden="true" className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border-2', anyBarber ? 'border-accent' : 'border-foreground/40')}>
              {anyBarber && <span className="size-2 rounded-full bg-accent" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">Siapa saja</span>
              <span className="block text-xs text-muted-foreground">Kami pilihkan kapster yang kosong</span>
            </span>
          </button>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(190px,230px))]">
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
      </div>
    </>
  )
}
