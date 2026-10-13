import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import type { Lesson } from '@/shared/api/generated/model'

import { lessonState } from './lessonMeta'

const lesson = (date: string, start = '14:00:00', end = '15:30:00') =>
  ({ date, start_time: start, end_time: end }) as Lesson

const now = dayjs('2026-10-09T14:30:00')

describe('lessonState', () => {
  it("o'tgan kun — o'tilgan", () => {
    expect(lessonState(lesson('2026-10-08'), now)).toBe('done')
  })

  it("bugun, boshlanmagan — bugun; davom etyapti — hozir; tugagan — o'tilgan", () => {
    expect(lessonState(lesson('2026-10-09', '16:00:00', '17:00:00'), now)).toBe('today')
    expect(lessonState(lesson('2026-10-09'), now)).toBe('now')
    expect(lessonState(lesson('2026-10-09', '12:00:00', '13:00:00'), now)).toBe('done')
  })

  it("tugash vaqtining o'zida o'tilgan hisoblanadi (backend is_lesson_completed: >=)", () => {
    expect(lessonState(lesson('2026-10-09', '13:00:00', '14:30:00'), now)).toBe('done')
  })

  it('kelajakdagi kun — rejada', () => {
    expect(lessonState(lesson('2026-10-10'), now)).toBe('upcoming')
  })
})
