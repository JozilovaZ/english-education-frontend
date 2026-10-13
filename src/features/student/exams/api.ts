import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getExamsListQueryKey,
  getExamsMyAttemptRetrieveQueryKey,
  getExamsRetrieveQueryKey,
  useExamsList,
  useExamsMyAttemptRetrieve,
  useExamsRetrieve,
} from '@/shared/api/generated/endpoints/exams/exams'
import type { ExamAttemptDetail } from '@/shared/api/generated/model'
import { listItems, type ListResponse } from '@/shared/api/list'
import { customInstance } from '@/shared/api/mutator'

import type { StudentExam, SubmitExamResponse } from './types'

const selectExamList = (data: unknown) => listItems(data as ListResponse<StudentExam>)

/** Talabaning guruhlaridagi faol imtihonlar (backend o'zi filtrlaydi) */
export function useStudentExams() {
  return useExamsList({
    query: {
      select: selectExamList,
    },
  })
}

/**
 * Backend savollar va variantlarni teskari tartibda (yangisi birinchi) qaytaradi —
 * o'qituvchi qo'shgan tartibda ko'rsatish uchun `id` bo'yicha saralaymiz.
 */
function normalizeExam(exam: StudentExam): StudentExam {
  const byId = (a: { id: number }, b: { id: number }) => a.id - b.id
  return {
    ...exam,
    questions: [...(exam.questions ?? [])]
      .sort(byId)
      .map((q) => ({ ...q, options: [...q.options].sort(byId) })),
  }
}

// Modul darajasida — barqaror funksiya bo'lsa TanStack `select` natijasini qayta hisoblamaydi
const selectExam = (data: unknown) => normalizeExam(data as StudentExam)

export function useStudentExam(id: number, enabled = true) {
  return useExamsRetrieve(id, {
    query: { enabled, select: selectExam },
  })
}

/**
 * Urinish tafsilotlari; urinish bo'lmasa backend 404 qaytaradi — qayta urinilmaydi.
 * `syncEvery` — imtihon paytida taymerni server bilan sinxronlash oralig'i (ms).
 */
export function useMyAttempt(id: number, enabled = true, syncEvery?: number) {
  return useExamsMyAttemptRetrieve(id, {
    query: {
      enabled,
      retry: false,
      refetchInterval: syncEvery,
      refetchOnWindowFocus: syncEvery ? 'always' : undefined,
    },
  })
}

function useInvalidateExam() {
  const queryClient = useQueryClient()
  return (id: number) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getExamsListQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getExamsRetrieveQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getExamsMyAttemptRetrieveQueryKey(id) }),
    ])
}

/**
 * Imtihonni boshlash. Takror chaqirish xavfsiz: mavjud urinish 200 bilan qaytadi
 * (sahifa yangilansa davom ettirish shu orqali). Savollar javobda yo'q — keyin
 * `GET /Exams/{id}/` dan olinadi (urinish paydo bo'lgach savollar ko'rinadi).
 */
export function useStartExam() {
  const invalidate = useInvalidateExam()
  return useMutation({
    mutationFn: (id: number) =>
      customInstance<ExamAttemptDetail>({ url: `/Exams/${id}/start/`, method: 'POST' }),
    onSuccess: (_, id) => invalidate(id),
  })
}

export interface SubmitExamPayload {
  id: number
  /** Har bir savol: tanlangan variant yoki null (javob berilmagan) */
  answers: { question_id: number; answer_id: number | null }[]
  file?: File | null
}

/**
 * Imtihonni topshirish. Fayl bo'lmasa — JSON. Fayl bo'lsa — multipart, javoblar
 * `answers[0]question_id` ko'rinishida (DRF nested ro'yxatni shunday o'qiydi; BACKEND_ISSUES #5).
 */
export function submitExam({ id, answers, file }: SubmitExamPayload) {
  const url = `/Exams/${id}/submit/`
  if (!file) {
    return customInstance<SubmitExamResponse>({
      url,
      method: 'POST',
      data: { answers },
    })
  }
  const form = new FormData()
  answers.forEach((a, i) => {
    form.append(`answers[${i}]question_id`, String(a.question_id))
    form.append(`answers[${i}]answer_id`, a.answer_id === null ? '' : String(a.answer_id))
  })
  form.append('submission_file', file)
  return customInstance<SubmitExamResponse>({ url, method: 'POST', data: form })
}

export function useSubmitExam() {
  const invalidate = useInvalidateExam()
  return useMutation({
    mutationFn: submitExam,
    onSuccess: (_, { id }) => invalidate(id),
  })
}
