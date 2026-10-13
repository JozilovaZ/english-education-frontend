import { describe, expect, it } from 'vitest'

import type { Schedule } from '@/shared/api/generated/model'

import { findConflicts } from './scheduleMeta'

const slot = (
  id: number,
  group: number,
  start: string,
  end: string,
  room = '101',
  day: Schedule['day_of_week'] = 'monday',
) => ({ id, group, day_of_week: day, start_time: start, end_time: end, room }) as Schedule

const all = [slot(1, 1, '14:00:00', '15:30:00', '101'), slot(2, 2, '16:00:00', '17:00:00', '202')]

describe('findConflicts', () => {
  it('bir xonada vaqti kesishgan boshqa guruh', () => {
    const c = findConflicts(all, slot(0, 3, '15:00:00', '16:00:00', '101'))
    expect(c.map((x) => x.id)).toEqual([1])
  })

  it("xona nomi katta-kichik harf va bo'shliqqa qaramaydi", () => {
    expect(findConflicts(all, slot(0, 3, '15:00:00', '16:00:00', ' 101 '))).toHaveLength(1)
  })

  it("shu guruhning boshqa xonadagi darsi ham to'qnashuv", () => {
    expect(findConflicts(all, slot(0, 1, '15:00:00', '16:00:00', '303'))).toHaveLength(1)
  })

  it("ketma-ket darslar (biri tugaganda ikkinchisi boshlanadi) — to'qnashuv emas", () => {
    expect(findConflicts(all, slot(0, 3, '15:30:00', '16:00:00', '101'))).toEqual([])
  })

  it("boshqa kun yoki boshqa xona — to'qnashuv emas", () => {
    expect(findConflicts(all, slot(0, 3, '14:00:00', '15:00:00', '101', 'tuesday'))).toEqual([])
    expect(findConflicts(all, slot(0, 3, '14:00:00', '15:00:00', '303'))).toEqual([])
  })

  it("xonasi bo'sh darslar xona bo'yicha to'qnashmaydi", () => {
    const noRoom = [slot(1, 1, '14:00:00', '15:00:00', '')]
    expect(findConflicts(noRoom, slot(0, 3, '14:00:00', '15:00:00', ''))).toEqual([])
  })

  it("tahrirlanayotgan yozuv o'zi bilan to'qnashmaydi", () => {
    expect(findConflicts(all, all[0], all[0].id)).toEqual([])
  })
})
