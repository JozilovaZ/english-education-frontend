import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'

import {
  getHomeworkListQueryKey,
  getHomeworkMySubmissionRetrieveQueryKey,
  useHomeworkList,
  useHomeworkMySubmissionRetrieve,
} from '@/shared/api/generated/endpoints/homeworks/homeworks'
import type { Homework, HomeworkSubmissionDetail } from '@/shared/api/generated/model'
import { listItems, type ListResponse } from '@/shared/api/list'
import { customInstance } from '@/shared/api/mutator'

/** Backend talaba uchun `my_submission` ni null qaytarishi mumkin (schema'da yo'q) */
export type StudentHomework = Omit<Homework, 'my_submission'> & {
  my_submission: Homework['my_submission'] | null
}

/**
 * Talaba nuqtai nazaridan holat (STATUS_MAPS.homework kalitlari):
 *  pending  — topshirilmagan, muddat bor
 *  overdue  — topshirilmagan, muddat o'tgan
 *  submitted — topshirilgan, baholanmagan
 *  graded   — baholangan
 */
export type HomeworkState = 'pending' | 'overdue' | 'submitted' | 'graded'

export function getHomeworkState(hw: StudentHomework): HomeworkState {
  const sub = hw.my_submission
  if (sub?.is_graded) return 'graded'
  if (sub) return 'submitted'
  return dayjs(hw.deadline).isBefore(dayjs()) ? 'overdue' : 'pending'
}

// Muddati o'tganlari oxirida: ular bilan endi hech narsa qilib bo'lmaydi
const ORDER: Record<HomeworkState, number> = { pending: 0, submitted: 1, graded: 2, overdue: 3 }

/** Ro'yxat tartibi: avval topshirish kerak bo'lganlar (eng yaqin muddat), keyin qolganlari */
function sortHomework(list: StudentHomework[]): StudentHomework[] {
  return [...list].sort((a, b) => {
    const sa = getHomeworkState(a)
    const sb = getHomeworkState(b)
    if (sa !== sb) return ORDER[sa] - ORDER[sb]
    const diff = dayjs(a.deadline).diff(dayjs(b.deadline))
    return sa === 'pending' ? diff : -diff
  })
}

const selectHomework = (data: unknown) =>
  sortHomework(listItems(data as ListResponse<StudentHomework>))

/**
 * Backend hozircha talabaga barcha guruhlarning vazifalarini qaytaradi (BACKEND_ISSUES #3, #7) —
 * boshqa guruh vazifasini topshirishda backend xato beradi, u forma ostida ko'rsatiladi.
 */
export function useStudentHomework() {
  return useHomeworkList({ query: { select: selectHomework } })
}

/** Topshirilgan javob (matn va fayl) — faqat topshirilgan vazifa uchun so'raladi */
export function useMySubmission(id: number, enabled: boolean) {
  return useHomeworkMySubmissionRetrieve(id, { query: { enabled, retry: false } })
}

export interface SubmitHomeworkPayload {
  homework: number
  answer: string
  file: File | null
}

/** Har doim multipart — fayl ixtiyoriy */
export function useSubmitHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ homework, answer, file }: SubmitHomeworkPayload) => {
      const form = new FormData()
      form.append('homework', String(homework))
      form.append('answer', answer)
      if (file) form.append('file', file)
      return customInstance<HomeworkSubmissionDetail>({
        url: '/Homework/submissions/',
        method: 'POST',
        data: form,
      })
    },
    onSuccess: (_, { homework }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: getHomeworkListQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getHomeworkMySubmissionRetrieveQueryKey(homework),
        }),
      ]),
  })
}
