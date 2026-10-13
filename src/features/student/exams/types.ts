import type {
  ExamAttemptDetail,
  ExamModels,
  StudentExamAttemptBrief,
} from '@/shared/api/generated/model'

/**
 * schema.yml da `questions` string, `my_attempt` esa null bo'lmaydigan qilib yozilgan —
 * aslida talaba uchun savollar massivi (variantlarda to'g'ri javob yo'q) va urinish bo'lmasa null.
 */
export interface StudentOption {
  id: number
  answer: string
}

export interface StudentQuestion {
  id: number
  question: string
  file: string | null
  points: number
  options: StudentOption[]
}

export type StudentExam = Omit<ExamModels, 'questions' | 'my_attempt'> & {
  /** Faqat imtihon boshlangandan keyin to'ladi */
  questions: StudentQuestion[]
  my_attempt: StudentExamAttemptBrief | null
}

/** `submit` javobi schema'dagidan farq qiladi: { message, data } */
export interface SubmitExamResponse {
  message: string
  data: ExamAttemptDetail
}

/**
 * Talaba nuqtai nazaridan imtihon holati:
 *  available   — boshlash mumkin
 *  in_progress — boshlangan, vaqt bor (davom ettirish)
 *  completed   — topshirilgan yoki vaqt tugab yopilgan
 *  timed_out   — boshlangan, lekin vaqt tugagan va hali yopilmagan
 *  expired     — boshlanmagan va deadline o'tgan
 */
export type ExamState = 'available' | 'in_progress' | 'completed' | 'timed_out' | 'expired'

export function getExamState(exam: StudentExam): ExamState {
  const attempt = exam.my_attempt
  if (attempt?.is_completed) return 'completed'
  if (attempt) return attempt.remaining_seconds > 0 ? 'in_progress' : 'timed_out'
  return exam.is_expired ? 'expired' : 'available'
}

/**
 * Yopilgan urinish haqiqatan topshirilganmi yoki vaqt tugab avtomatik yopilganmi.
 * Backend vaqt tugaganda urinishni javobsiz `is_completed=true` qiladi.
 */
export function wasSubmitted(attempt: ExamAttemptDetail): boolean {
  return attempt.student_answers.length > 0 || !!attempt.submission_file
}
