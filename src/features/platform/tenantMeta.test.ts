import { describe, expect, it } from 'vitest'

import { growth, isExpiring, monthLabel, subscription } from './tenantMeta'

const t = (days_left: number, on_trial = false, is_active = days_left >= 0) => ({
  days_left,
  on_trial,
  is_active,
})

describe('subscription', () => {
  it('sinov muddati sanadan ustun', () => {
    expect(subscription(t(-10, true, true)).label).toBe('Sinov muddati')
  })

  it("to'langan, tez tugaydi, bugun tugaydi, tugagan", () => {
    expect(subscription(t(90))).toEqual({ label: "To'langan", variant: 'pos' })
    expect(subscription(t(7))).toEqual({ label: '7 kunda tugaydi', variant: 'warn' })
    expect(subscription(t(0)).label).toBe('Bugun tugaydi')
    expect(subscription(t(-1))).toEqual({ label: 'Muddati tugagan', variant: 'neg' })
  })
})

describe('isExpiring', () => {
  it("faqat 0–30 kun qolgan, sinovda bo'lmagan faol markazlar", () => {
    expect(isExpiring(t(30))).toBe(true)
    expect(isExpiring(t(31))).toBe(false)
    expect(isExpiring(t(5, true, true))).toBe(false)
    expect(isExpiring(t(-1))).toBe(false)
  })
})

describe('monthLabel va growth', () => {
  it('"2026-10" → "okt 2026"', () => {
    expect(monthLabel('2026-10')).toBe('okt 2026')
    expect(monthLabel('boshqa')).toBe('boshqa')
  })

  it("o'sish foizi", () => {
    expect(growth(0)).toBe("o'zgarishsiz")
    expect(growth(12.6)).toBe("+13% o'tgan oyga nisbatan")
    expect(growth(-50)).toBe("-50% o'tgan oyga nisbatan")
  })
})
