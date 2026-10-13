import dayjs, { type Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

/**
 * Backend formatlari:
 *  - DateField      → "2026-10-07"
 *  - TimeField      → "14:00:00"
 *  - DateTimeField  → "2026-10-07T10:46:44.325865+05:00" (Asia/Samarkand)
 *  - DurationField  → "90 00:00:00" (kun bilan) yoki "02:00:00"
 *  - DecimalField   → "450.00" (string)
 */

const EMPTY = '—'

export function formatDate(value?: string | null): string {
  return value ? dayjs(value).format('DD.MM.YYYY') : EMPTY
}

export function formatDateTime(value?: string | null): string {
  return value ? dayjs(value).format('DD.MM.YYYY HH:mm') : EMPTY
}

/** "14:00:00" → "14:00" */
export function formatTime(value?: string | null): string {
  return value ? value.slice(0, 5) : EMPTY
}

export function toApiDate(value: Dayjs): string {
  return value.format('YYYY-MM-DD')
}

export function toApiTime(value: Dayjs): string {
  return value.format('HH:mm:ss')
}

/** "14:00:00" → Dayjs (TimePicker uchun) */
export function parseApiTime(value?: string | null): Dayjs | undefined {
  return value ? dayjs(value, 'HH:mm:ss') : undefined
}

export interface DurationParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Django DurationField: "90 00:00:00", "1 02:30:00", "02:00:00", "P90D" (ISO) */
export function parseDuration(value?: string | null): DurationParts {
  const result = { days: 0, hours: 0, minutes: 0, seconds: 0 }
  if (!value) return result

  const iso = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/.exec(value)
  if (iso) {
    return {
      days: Number(iso[1] ?? 0),
      hours: Number(iso[2] ?? 0),
      minutes: Number(iso[3] ?? 0),
      seconds: Math.floor(Number(iso[4] ?? 0)),
    }
  }

  const match = /^(?:(-?\d+) )?(\d+):(\d+):(\d+)(?:\.\d+)?$/.exec(value)
  if (!match) return result
  return {
    days: Number(match[1] ?? 0),
    hours: Number(match[2]),
    minutes: Number(match[3]),
    seconds: Number(match[4]),
  }
}

export function toApiDuration({
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
}: Partial<DurationParts>): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days ? `${days} ${time}` : time
}

/** "90 00:00:00" → "90 kun", "01:30:00" → "1 soat 30 daqiqa" */
export function formatDuration(value?: string | null): string {
  if (!value) return EMPTY
  const { days, hours, minutes } = parseDuration(value)
  const parts = [
    days && `${days} kun`,
    hours && `${hours} soat`,
    minutes && `${minutes} daqiqa`,
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : '0 daqiqa'
}

/** DurationField → soniyalar: "02:00:00" → 7200 */
export function durationToSeconds(value?: string | null): number {
  const { days, hours, minutes, seconds } = parseDuration(value)
  return ((days * 24 + hours) * 60 + minutes) * 60 + seconds
}

/** Soniyalar → "HH:MM:SS" (taymer, sarflangan vaqt) */
export function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** Muddatgacha qolgan vaqt: "3 kun qoldi", "5 soat qoldi" (o'tgan bo'lsa null) */
export function formatTimeLeft(deadline?: string | null): string | null {
  if (!deadline) return null
  const mins = dayjs(deadline).diff(dayjs(), 'minute')
  if (mins <= 0) return null
  if (mins < 60) return `${mins} daqiqa qoldi`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} soat qoldi`
  return `${Math.floor(mins / (60 * 24))} kun qoldi`
}

/** "2026-10-20T18:00:00+05:00" → "20.10 · 18:00" (dizayndagi qisqa format) */
export function formatShortDateTime(value?: string | null): string {
  return value ? dayjs(value).format('DD.MM · HH:mm') : EMPTY
}

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

/** "450000.00" → "450 000 so'm" */
export function formatMoney(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return EMPTY
  return `${moneyFormatter.format(Number(value))} so'm`
}

export function formatPhone(value?: string | null): string {
  if (!value) return EMPTY
  const digits = value.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
  }
  return value
}

export function fullName(
  user?: { first_name?: string; last_name?: string; username?: string } | null,
): string {
  if (!user) return EMPTY
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || EMPTY
}
