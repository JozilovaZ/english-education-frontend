import { formatDuration } from '@/shared/lib/format'
import type { TagVariant } from '@/shared/ui'

import type { ExamState, StudentExam } from './types'

export const EXAM_STATE_TAG: Record<ExamState, { variant: TagVariant; label: string }> = {
  available: { variant: 'prog', label: 'Faol' },
  in_progress: { variant: 'prog', label: 'Jarayonda' },
  completed: { variant: 'neu', label: 'Topshirilgan' },
  timed_out: { variant: 'neg', label: 'Vaqt tugadi' },
  expired: { variant: 'warn', label: "Muddati o'tgan" },
}

/** Imtihon davomiyligi: "2 soat", "45 daqiqa" (berilmagan bo'lsa — "Cheklanmagan") */
export function examDuration(exam: StudentExam): string {
  return exam.duration ? formatDuration(exam.duration) : 'Cheklanmagan'
}
