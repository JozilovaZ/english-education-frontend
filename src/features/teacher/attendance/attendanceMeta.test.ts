import { describe, expect, it } from 'vitest'

import type { Attendance, GroupStudent } from '@/shared/api/generated/model'

import { changedItems, initialDraft, markRestPresent } from './attendanceMeta'

const student = (id: number) => ({ student_id: id }) as GroupStudent
const record = (student: number, status: Attendance['status'], note = '') =>
  ({ student, status, note }) as Attendance

const students = [student(1), student(2), student(3)]

describe('initialDraft', () => {
  it("saqlangan davomat bilan to'ldiradi, qolganlari belgilanmagan", () => {
    expect(initialDraft(students, [record(2, 'absent', 'kasal')])).toEqual({
      1: { status: undefined, note: '' },
      2: { status: 'absent', note: 'kasal' },
      3: { status: undefined, note: '' },
    })
  })
})

describe('changedItems', () => {
  const records = [record(1, 'present'), record(2, 'absent', 'kasal')]

  it("o'zgarmagan qatorlarni yubormaydi (ota-onaga takroriy xabar ketmasligi uchun)", () => {
    expect(changedItems(students, initialDraft(students, records), records)).toEqual([])
  })

  it('belgilanmagan talabani yubormaydi', () => {
    const draft = { 1: { note: '' }, 2: { note: '' }, 3: { note: '' } }
    expect(changedItems(students, draft, [])).toEqual([])
  })

  it("yangi belgi va o'zgargan holatni yuboradi", () => {
    const draft = {
      1: { status: 'late' as const, note: '' },
      2: { status: 'absent' as const, note: 'kasal' },
      3: { status: 'present' as const, note: '' },
    }
    expect(changedItems(students, draft, records)).toEqual([
      { student: 1, status: 'late', note: '' },
      { student: 3, status: 'present', note: '' },
    ])
  })

  it("faqat izoh o'zgarsa ham yuboradi, bo'shliqlarni olib tashlaydi", () => {
    const draft = {
      ...initialDraft(students, records),
      2: { status: 'absent' as const, note: '  isitma ' },
    }
    expect(changedItems(students, draft, records)).toEqual([
      { student: 2, status: 'absent', note: 'isitma' },
    ])
  })

  it("izohdagi ortiqcha bo'shliq o'zgarish hisoblanmaydi", () => {
    const draft = {
      ...initialDraft(students, records),
      2: { status: 'absent' as const, note: 'kasal ' },
    }
    expect(changedItems(students, draft, records)).toEqual([])
  })
})

describe('markRestPresent', () => {
  it('faqat belgilanmaganlarni «kelgan» qiladi', () => {
    expect(markRestPresent({ 1: { note: '' }, 2: { status: 'absent', note: 'x' } })).toEqual({
      1: { status: 'present', note: '' },
      2: { status: 'absent', note: 'x' },
    })
  })
})
