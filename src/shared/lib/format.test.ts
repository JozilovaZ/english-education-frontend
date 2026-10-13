import { describe, expect, it } from 'vitest'

import {
  durationToSeconds,
  formatDuration,
  formatHms,
  formatMoney,
  formatPhone,
  parseDuration,
  toApiDuration,
} from './format'

describe('parseDuration — Django DurationField', () => {
  it.each([
    ['02:00:00', { days: 0, hours: 2, minutes: 0, seconds: 0 }],
    ['90 00:00:00', { days: 90, hours: 0, minutes: 0, seconds: 0 }],
    ['1 02:30:15', { days: 1, hours: 2, minutes: 30, seconds: 15 }],
    ['00:45:00.123456', { days: 0, hours: 0, minutes: 45, seconds: 0 }],
    ['P90D', { days: 90, hours: 0, minutes: 0, seconds: 0 }],
    ['PT1H30M', { days: 0, hours: 1, minutes: 30, seconds: 0 }],
  ])('%s', (value, expected) => {
    expect(parseDuration(value)).toEqual(expected)
  })

  it("bo'sh yoki noto'g'ri qiymat — nol", () => {
    expect(parseDuration(null)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    expect(parseDuration('abc')).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe('toApiDuration', () => {
  it('kunsiz va kunli', () => {
    expect(toApiDuration({ hours: 1, minutes: 5 })).toBe('01:05:00')
    expect(toApiDuration({ days: 30 })).toBe('30 00:00:00')
  })

  it('parseDuration bilan qaytma-qaytish', () => {
    expect(toApiDuration(parseDuration('3 04:05:06'))).toBe('3 04:05:06')
  })
})

describe('davomiylik va taymer', () => {
  it('formatDuration', () => {
    expect(formatDuration('01:30:00')).toBe('1 soat 30 daqiqa')
    expect(formatDuration('90 00:00:00')).toBe('90 kun')
    expect(formatDuration('00:00:00')).toBe('0 daqiqa')
    expect(formatDuration(null)).toBe('—')
  })

  it('durationToSeconds', () => {
    expect(durationToSeconds('1 01:00:30')).toBe(90_030)
  })

  it('formatHms: manfiy qiymat noldan pastga tushmaydi', () => {
    expect(formatHms(3725)).toBe('01:02:05')
    expect(formatHms(-5)).toBe('00:00:00')
  })
})

describe('formatPhone', () => {
  it("O'zbekiston raqami guruhlanadi", () => {
    expect(formatPhone('+998901234567')).toBe('+998 90 123 45 67')
  })
  it("boshqa format o'zgarmaydi", () => {
    expect(formatPhone('+12025550123')).toBe('+12025550123')
    expect(formatPhone(null)).toBe('—')
  })
})

describe('formatMoney', () => {
  it("so'm bilan, mingliklar ajratilgan", () => {
    // ru-RU ajratgichi — bo'linmas bo'shliq
    expect(formatMoney('450000.00').replace(/\s/g, ' ')).toBe("450 000 so'm")
    expect(formatMoney('')).toBe('—')
  })
})
