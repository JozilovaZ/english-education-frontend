import { describe, expect, it } from 'vitest'

import { inputToLocal, valueToLocal } from './phoneDigits'

describe('valueToLocal', () => {
  it('"+998" — doim davlat kodi, hatto raqam qisqa bo\'lsa ham', () => {
    expect(valueToLocal('+9989')).toBe('9')
    expect(valueToLocal('+99890')).toBe('90')
    expect(valueToLocal('+998901234567')).toBe('901234567')
  })
  it('998 bilan boshlanadigan mahalliy raqam buzilmaydi', () => {
    expect(valueToLocal('+998998123456')).toBe('998123456')
    expect(valueToLocal('+998998')).toBe('998')
  })
  it('backenddan "+" siz kelgan to\'liq raqam', () => {
    expect(valueToLocal('998901234567')).toBe('901234567')
  })
  it("bo'sh qiymat", () => {
    expect(valueToLocal(undefined)).toBe('')
    expect(valueToLocal('')).toBe('')
  })
})

describe('inputToLocal', () => {
  it('yozilgan mahalliy raqam', () => {
    expect(inputToLocal('90 123 45 6')).toBe('90123456')
    expect(inputToLocal('99 812 34 56')).toBe('998123456')
  })
  it("nusxalab qo'yilgan to'liq raqam", () => {
    expect(inputToLocal('+998 90 123 45 67')).toBe('901234567')
    expect(inputToLocal('+998901234567')).toBe('901234567')
    expect(inputToLocal('998998123456')).toBe('998123456')
  })
})
