import type { Attendance, GroupStudent, StatusF1cEnum } from '@/shared/api/generated/model'

export type Status = StatusF1cEnum

/** Talaba ID → formadagi holat va izoh (holat tanlanmagan bo'lishi mumkin) */
export type Draft = Record<number, { status?: Status; note: string }>

export const STATUSES: Status[] = ['present', 'late', 'absent', 'excused']

/** Backend shu holatlarda ota-onaga Telegram xabar yuboradi */
export const NOTIFIES: Status[] = ['absent', 'late']

/** Forma boshlang'ich holati: oldin saqlangan davomat bo'lsa, u bilan to'ldiriladi */
export function initialDraft(students: GroupStudent[], records: Attendance[]): Draft {
  const saved = new Map(records.map((r) => [r.student, r]))
  return Object.fromEntries(
    students.map((s) => {
      const r = saved.get(s.student_id)
      return [s.student_id, { status: r?.status, note: r?.note ?? '' }]
    }),
  )
}

/**
 * Yuboriladigan qatorlar: faqat holati tanlangan va saqlanganidan farq qiladiganlar.
 * Backend har saqlashda kelmagan/kechikkanlar ota-onasiga qayta xabar yuboradi —
 * o'zgarmagan qatorni qayta yuborish ota-onaga takroriy xabar demakdir.
 */
export function changedItems(students: GroupStudent[], draft: Draft, records: Attendance[]) {
  const saved = new Map(records.map((r) => [r.student, r]))
  return students.flatMap((s) => {
    const d = draft[s.student_id]
    if (!d?.status) return []
    const r = saved.get(s.student_id)
    const note = d.note.trim()
    if (d.status === r?.status && note === (r?.note ?? '')) return []
    return [{ student: s.student_id, status: d.status, note }]
  })
}

/** "Qolganlari keldi": belgilanmaganlarga `present`, belgilanganlar o'zgarmaydi */
export function markRestPresent(draft: Draft): Draft {
  return Object.fromEntries(
    Object.entries(draft).map(([id, d]) => [id, { ...d, status: d.status ?? 'present' }]),
  )
}
