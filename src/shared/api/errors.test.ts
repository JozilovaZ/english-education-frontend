import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'

import { parseApiError } from './errors'

const httpError = (status: number, data: unknown) =>
  new AxiosError('fail', 'ERR', undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe('parseApiError', () => {
  it('{ detail: "matn" } — umumiy xabar', () => {
    expect(parseApiError(httpError(400, { detail: "Guruh to'lgan!" }))).toEqual({
      message: "Guruh to'lgan!",
      fieldErrors: {},
    })
  })

  it('DRF serializer — maydon xatolari, xabar birinchi maydondan', () => {
    const parsed = parseApiError(
      httpError(400, { capacity: ["Sig'im kam"], phone: ['Band', "Noto'g'ri"] }),
    )
    expect(parsed.fieldErrors).toEqual({ capacity: "Sig'im kam", phone: "Band Noto'g'ri" })
    expect(parsed.message).toBe("Sig'im kam")
  })

  it('{ detail: { field: [...] } } — ichki maydon xatolari (core/exceptions.py)', () => {
    expect(parseApiError(httpError(400, { detail: { lesson: ["Dars o'tilmagan"] } }))).toEqual({
      message: "Dars o'tilmagan",
      fieldErrors: { lesson: "Dars o'tilmagan" },
    })
  })

  it('non_field_errors — umumiy xabar', () => {
    const parsed = parseApiError(httpError(400, { non_field_errors: ['Takroriy dars'] }))
    expect(parsed).toEqual({ message: 'Takroriy dars', fieldErrors: {} })
  })

  it("ro'yxat ko'rinishidagi javob", () => {
    expect(parseApiError(httpError(400, ['Birinchi', 'Ikkinchi'])).message).toBe(
      'Birinchi Ikkinchi',
    )
  })

  it("500 va bo'sh javob — server xatosi", () => {
    expect(parseApiError(httpError(500, '')).message).toBe('Serverda xatolik yuz berdi.')
  })

  it('javobsiz (tarmoq) xato', () => {
    expect(parseApiError(new AxiosError('Network Error')).message).toMatch(/aloqa yo'q/)
  })

  it("axios bo'lmagan xato", () => {
    expect(parseApiError(new Error('x')).message).toBe('Kutilmagan xatolik yuz berdi.')
  })
})
