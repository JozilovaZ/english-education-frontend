import type { TagVariant } from '@/shared/ui'

/** Obuna tugashiga shuncha kun qolsa ogohlantiriladi */
export const EXPIRING_DAYS = 30

interface TenantLike {
  on_trial: boolean
  is_active: boolean
  days_left: number
}

/** Obuna holati: sinov · to'langan · tez tugaydi · tugagan */
export function subscription(t: TenantLike): { label: string; variant: TagVariant } {
  if (t.on_trial) return { label: 'Sinov muddati', variant: 'prog' }
  if (!t.is_active || t.days_left < 0) return { label: 'Muddati tugagan', variant: 'neg' }
  if (t.days_left <= EXPIRING_DAYS)
    return {
      label: t.days_left === 0 ? 'Bugun tugaydi' : `${t.days_left} kunda tugaydi`,
      variant: 'warn',
    }
  return { label: "To'langan", variant: 'pos' }
}

export const isExpiring = (t: TenantLike) =>
  !t.on_trial && t.is_active && t.days_left >= 0 && t.days_left <= EXPIRING_DAYS

const MONTHS = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyun',
  'iyul',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
]

/** "2026-10" → "okt 2026"; boshqa formatlar o'zgarishsiz */
export function monthLabel(value: string) {
  const m = /^(\d{4})-(\d{2})/.exec(value)
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : value
}

export const growth = (pct: number) =>
  pct === 0 ? "o'zgarishsiz" : `${pct > 0 ? '+' : ''}${Math.round(pct)}% o'tgan oyga nisbatan`
