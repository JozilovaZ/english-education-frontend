import type { ExamAttemptDetail } from '@/shared/api/generated/model'

import type { TagVariant } from '../statusMaps'

export type AttemptFilter = 'all' | 'pass' | 'fail' | 'none'

export const ATTEMPT_TABS: [AttemptFilter, string][] = [
  ['all', 'Hammasi'],
  ['pass', "O'tdi"],
  ['fail', "O'ta olmadi"],
  ['none', 'Topshirmagan'],
]

/** Talabaning imtihondagi holati (urinish yo'q — "Topshirmagan") */
export function attemptStatus(a?: ExamAttemptDetail): {
  status: AttemptFilter
  tag: { variant: TagVariant; label: string }
} {
  if (!a) return { status: 'none', tag: { variant: 'neu', label: 'Topshirmagan' } }
  if (!a.is_completed) return { status: 'none', tag: { variant: 'prog', label: 'Jarayonda' } }
  // Backend vaqt tugaganda urinishni javobsiz yopadi
  if (!a.student_answers.length && !a.submission_file && !a.teacher_comment)
    return { status: 'fail', tag: { variant: 'neg', label: 'Vaqt tugadi' } }
  return a.is_passed
    ? { status: 'pass', tag: { variant: 'pos', label: "O'tdi" } }
    : { status: 'fail', tag: { variant: 'neg', label: "O'ta olmadi" } }
}
