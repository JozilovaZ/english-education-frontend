import type { DayOfWeekEnum, Schedule } from '@/shared/api/generated/model'

export const DAYS: { value: DayOfWeekEnum; label: string; short: string }[] = [
  { value: 'monday', label: 'Dushanba', short: 'Du' },
  { value: 'tuesday', label: 'Seshanba', short: 'Se' },
  { value: 'wednesday', label: 'Chorshanba', short: 'Chor' },
  { value: 'thursday', label: 'Payshanba', short: 'Pay' },
  { value: 'friday', label: 'Juma', short: 'Ju' },
  { value: 'saturday', label: 'Shanba', short: 'Sha' },
  { value: 'sunday', label: 'Yakshanba', short: 'Yak' },
]

/** Ikki vaqt oralig'i kesishadimi ("14:00:00" formatida) */
const overlaps = (a: Pick<Schedule, 'start_time' | 'end_time'>, s: string, e: string) =>
  a.start_time < e && s < a.end_time

const sameRoom = (a?: string, b?: string) =>
  !!a?.trim() && a.trim().toLowerCase() === b?.trim().toLowerCase()

type Slot = Pick<Schedule, 'group' | 'day_of_week' | 'start_time' | 'end_time' | 'room'>

/** Backend to'qnashuvni tekshirmaydi — o'sha kunda vaqti kesishgan shu guruh yoki shu xona darslari */
export function findConflicts(all: Schedule[], slot: Slot, selfId?: number) {
  return all.filter(
    (x) =>
      x.id !== selfId &&
      x.day_of_week === slot.day_of_week &&
      overlaps(x, slot.start_time, slot.end_time) &&
      (x.group === slot.group || sameRoom(x.room, slot.room)),
  )
}

/**
 * Guruh jadvalining qisqa ko'rinishi: bir xil vaqtdagi kunlar birlashtiriladi.
 *   ["Du, Chor, Ju · 14:00–15:30", "Sha · 10:00–11:30"]
 */
export function scheduleSummary(
  list: readonly Pick<Schedule, 'day_of_week' | 'start_time' | 'end_time'>[],
): string[] {
  const byTime = new Map<string, number[]>()
  for (const s of list) {
    const key = `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`
    const day = DAYS.findIndex((d) => d.value === s.day_of_week)
    byTime.set(key, [...(byTime.get(key) ?? []), day])
  }
  return [...byTime]
    .map(([time, days]) => ({ time, days: [...new Set(days)].sort((a, b) => a - b) }))
    .sort((a, b) => a.days[0] - b.days[0] || a.time.localeCompare(b.time))
    .map(({ time, days }) => `${days.map((i) => DAYS[i].short).join(', ')} · ${time}`)
}
