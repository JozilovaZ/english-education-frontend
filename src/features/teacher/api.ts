import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  Attendance,
  BulkAttendanceItem,
  ExamAttemptDetail,
  ExamModels,
  ExamQuestion,
  GroupStudent,
  Homework,
  HomeworkSubmissionDetail,
  Lesson,
  LessonMaterial,
  TeacherGroupDetail,
  TeacherGroupList,
} from '@/shared/api/generated/model'
import { listItems, type ListResponse } from '@/shared/api/list'
import { customInstance } from '@/shared/api/mutator'

/**
 * O'qituvchi bo'limi so'rovlari. Ba'zi query parametrlari (`?exam=`, `?homework=`) schema.yml da
 * yo'q, shuning uchun generatsiya qilingan hooklar o'rniga shu yerda yozilgan.
 * Kalitlar bitta joyda — invalidatsiya oson bo'lishi uchun.
 */
export const teacherKeys = {
  groups: ['teacher', 'groups'] as const,
  group: (id: number) => ['teacher', 'groups', id] as const,
  students: (groupId: number) => ['teacher', 'groups', groupId, 'students'] as const,
  lessons: ['teacher', 'lessons'] as const,
  attendanceAll: ['teacher', 'attendance'] as const,
  attendance: (lessonId: number) => ['teacher', 'attendance', lessonId] as const,
  materials: ['teacher', 'materials'] as const,
  exams: ['teacher', 'exams'] as const,
  exam: (id: number) => ['teacher', 'exams', id] as const,
  questions: (examId: number) => ['teacher', 'exams', examId, 'questions'] as const,
  attempts: ['teacher', 'attempts'] as const,
  attempt: (id: number) => ['teacher', 'attempts', id] as const,
  homework: ['teacher', 'homework'] as const,
  submissions: (homeworkId: number) => ['teacher', 'homework', homeworkId, 'submissions'] as const,
  allSubmissions: ['teacher', 'homework', 'all-submissions'] as const,
}

const getList = <T>(url: string, params?: Record<string, unknown>) =>
  customInstance<ListResponse<T>>({ url, method: 'GET', params }).then(listItems)

const byId = (a: { id: number }, b: { id: number }) => a.id - b.id

/** Backend savollar va variantlarni teskari tartibda qaytaradi — qo'shilgan tartibda ko'rsatamiz */
export function normalizeQuestions(list: ExamQuestion[]): ExamQuestion[] {
  return [...list].sort(byId).map((q) => ({ ...q, answers: [...q.answers].sort(byId) }))
}

/* ------------------------------ Guruh va darslar ------------------------------ */

export function useTeacherGroups() {
  return useQuery({
    queryKey: teacherKeys.groups,
    queryFn: () => getList<TeacherGroupList>('/Educations/teacher/groups/'),
  })
}

/** Guruhdagi faol talabalar (chiqib ketganlar hisobga olinmaydi) */
export function useGroupStudents(groupId: number | undefined) {
  return useQuery({
    queryKey: teacherKeys.students(groupId ?? 0),
    queryFn: () =>
      getList<GroupStudent>(`/Educations/teacher/groups/${groupId}/students/`).then((list) =>
        list.filter((s) => !s.left_at),
      ),
    enabled: !!groupId,
  })
}

export function useTeacherLessons() {
  return useQuery({
    queryKey: teacherKeys.lessons,
    queryFn: () => getList<Lesson>('/Educations/lessons/'),
  })
}

/** Guruh tafsilotlari: dars jadvali (`schedules`), kurs, darslar soni */
export function useTeacherGroup(id: number | undefined) {
  return useQuery({
    queryKey: teacherKeys.group(id ?? 0),
    queryFn: () =>
      customInstance<TeacherGroupDetail>({
        url: `/Educations/teacher/groups/${id}/`,
        method: 'GET',
      }),
    enabled: !!id,
  })
}

export interface LessonPayload {
  group: number
  title: string
  description: string
  lesson_number: number
  date: string
  start_time: string
  end_time: string
}

export function useSaveLesson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: LessonPayload }) =>
      customInstance<Lesson>({
        url: id ? `/Educations/lessons/${id}/` : '/Educations/lessons/',
        method: id ? 'PATCH' : 'POST',
        data,
      }),
    onSuccess: (lesson) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherKeys.lessons }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.group(lesson.group) }),
      ]),
  })
}

export function useDeleteLesson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      customInstance<void>({ url: `/Educations/lessons/${id}/`, method: 'DELETE' }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherKeys.lessons }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.groups }),
      ]),
  })
}

/* ------------------------------ Davomat ------------------------------ */

export function useLessonAttendance(lessonId: number | undefined) {
  return useQuery({
    queryKey: teacherKeys.attendance(lessonId ?? 0),
    queryFn: () => getList<Attendance>('/Attendance/', { lesson: lessonId }),
    enabled: !!lessonId,
  })
}

/**
 * Ommaviy davomat. Backend har saqlashda kelmagan/kechikkanlar ota-onasiga qayta xabar yuboradi —
 * shuning uchun chaqiruvchi faqat o'zgargan qatorlarni yuboradi.
 */
export function useBulkAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { lesson: number; attendances: BulkAttendanceItem[] }) =>
      customInstance<{ message: string; count: number; data: Attendance[] }>({
        url: '/Attendance/bulk-mark/',
        method: 'POST',
        data,
      }),
    // Prefiks: shu dars va bosh sahifadagi umumiy davomat ham yangilanadi
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.attendanceAll }),
  })
}

/* ------------------------------ Materiallar ------------------------------ */

export function useTeacherMaterials() {
  return useQuery({
    queryKey: teacherKeys.materials,
    queryFn: () => getList<LessonMaterial>('/LessonMaterial/'),
  })
}

export interface MaterialPayload {
  lesson: number
  title: string
  description: string
  file: File | null
  url: string
}

/** Material + resurslar: fayl va havola alohida resurs sifatida saqlanadi */
export function useCreateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, url, ...data }: MaterialPayload) => {
      const material = await customInstance<LessonMaterial>({
        url: '/LessonMaterial/',
        method: 'POST',
        data,
      })
      if (file) {
        const form = new FormData()
        form.append('material', String(material.id))
        form.append('file', file)
        await customInstance({ url: '/LessonMaterial/resources/', method: 'POST', data: form })
      }
      if (url) {
        await customInstance({
          url: '/LessonMaterial/resources/',
          method: 'POST',
          data: { material: material.id, url },
        })
      }
      return material
    },
    // Resurs yuklanmasa ham material yaratilgan bo'lishi mumkin — ro'yxatni har doim yangilaymiz
    onSettled: () => queryClient.invalidateQueries({ queryKey: teacherKeys.materials }),
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      customInstance<void>({ url: `/LessonMaterial/${id}/`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.materials }),
  })
}

/* ------------------------------ Imtihonlar ------------------------------ */

/** O'qituvchi uchun `questions` — to'liq savollar (to'g'ri javob bilan) */
export type TeacherExam = Omit<ExamModels, 'questions' | 'my_attempt'> & {
  questions: ExamQuestion[]
}

export function useTeacherExams() {
  return useQuery({
    queryKey: teacherKeys.exams,
    queryFn: () => getList<TeacherExam>('/Exams/'),
  })
}

export function useTeacherExam(id: number, enabled = true) {
  return useQuery({
    queryKey: teacherKeys.exam(id),
    queryFn: () => customInstance<TeacherExam>({ url: `/Exams/${id}/`, method: 'GET' }),
    enabled,
  })
}

export interface ExamPayload {
  group: number
  name: string
  description: string
  deadline: string
  duration: string | null
  passing_score: number
  is_active: boolean
}

export function useSaveExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: ExamPayload }) =>
      customInstance<TeacherExam>({
        url: id ? `/Exams/${id}/` : '/Exams/',
        method: id ? 'PATCH' : 'POST',
        data,
      }),
    onSuccess: (exam) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherKeys.exams }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.exam(exam.id) }),
      ]),
  })
}

export function useDeleteExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => customInstance<void>({ url: `/Exams/${id}/`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.exams }),
  })
}

/* ------------------------------ Savollar ------------------------------ */

export function useExamQuestions(examId: number) {
  return useQuery({
    queryKey: teacherKeys.questions(examId),
    queryFn: () =>
      getList<ExamQuestion>('/Exams/questions/', { exam: examId }).then(normalizeQuestions),
  })
}

export interface OptionDraft {
  /** Mavjud variant; yangi variantda yo'q */
  id?: number
  /** React kaliti (yangi variantlar uchun ham barqaror) */
  key: string
  answer: string
  is_correct: boolean
}

export interface QuestionDraft {
  id?: number
  key: string
  question: string
  points: number
  /** Mavjud fayl URL'i */
  fileUrl: string | null
  /** Yangi tanlangan fayl */
  file: File | null
  options: OptionDraft[]
}

/**
 * Bitta savolni variantlari bilan saqlaydi. Backend har birini alohida endpoint'da saqlaydi:
 * savol (POST/PATCH, fayl bo'lsa multipart) → o'chirilgan variantlar (DELETE) →
 * o'zgargan (PATCH) → yangi (POST). Faqat haqiqatan o'zgargan qismlar yuboriladi.
 */
export async function saveQuestion(
  examId: number,
  draft: QuestionDraft,
  original: ExamQuestion | undefined,
): Promise<number> {
  let questionId = draft.id
  const changed =
    !original ||
    original.question !== draft.question ||
    (original.points ?? 1) !== draft.points ||
    !!draft.file
  if (changed) {
    let data: FormData | Record<string, unknown> = {
      exam: examId,
      question: draft.question,
      points: draft.points,
    }
    if (draft.file) {
      const form = new FormData()
      form.append('exam', String(examId))
      form.append('question', draft.question)
      form.append('points', String(draft.points))
      form.append('file', draft.file)
      data = form
    }
    const saved = await customInstance<ExamQuestion>({
      url: questionId ? `/Exams/questions/${questionId}/` : '/Exams/questions/',
      method: questionId ? 'PATCH' : 'POST',
      data,
    })
    questionId = saved.id
  }

  const before = new Map((original?.answers ?? []).map((a) => [a.id, a]))
  const keep = new Set(draft.options.flatMap((o) => (o.id ? [o.id] : [])))
  for (const old of before.values()) {
    if (!keep.has(old.id)) {
      await customInstance<void>({ url: `/Exams/answers/${old.id}/`, method: 'DELETE' })
    }
  }
  for (const option of draft.options) {
    const prev = option.id ? before.get(option.id) : undefined
    if (prev && prev.answer === option.answer && !!prev.is_correct === option.is_correct) continue
    await customInstance({
      url: option.id ? `/Exams/answers/${option.id}/` : '/Exams/answers/',
      method: option.id ? 'PATCH' : 'POST',
      data: { question: questionId, answer: option.answer, is_correct: option.is_correct },
    })
  }
  return questionId!
}

export function useSaveQuestion(examId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ draft, original }: { draft: QuestionDraft; original?: ExamQuestion }) =>
      saveQuestion(examId, draft, original),
    // Xato bo'lsa ham qisman saqlangan bo'lishi mumkin — ro'yxatni har doim yangilaymiz
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherKeys.questions(examId) }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.exams }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.exam(examId) }),
      ]),
  })
}

export function useDeleteQuestion(examId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      customInstance<void>({ url: `/Exams/questions/${id}/`, method: 'DELETE' }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherKeys.questions(examId) }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.exams }),
      ]),
  })
}

/* ------------------------------ Urinishlar ------------------------------ */

/** O'qituvchining barcha guruhlaridagi urinishlar (jadvaldagi "Topshirdi" ustuni uchun ham) */
export function useTeacherAttempts() {
  return useQuery({
    queryKey: teacherKeys.attempts,
    queryFn: () => getList<ExamAttemptDetail>('/Exams/attempts/'),
  })
}

export function useAttempt(id: number) {
  return useQuery({
    queryKey: teacherKeys.attempt(id),
    queryFn: () =>
      customInstance<ExamAttemptDetail>({ url: `/Exams/attempts/${id}/`, method: 'GET' }),
  })
}

export function useGradeAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      score,
      teacher_comment,
    }: {
      id: number
      score: number
      teacher_comment: string
    }) =>
      customInstance<{ message: string; data: ExamAttemptDetail }>({
        url: `/Exams/attempts/${id}/grade/`,
        method: 'POST',
        data: { score, teacher_comment },
      }),
    onSuccess: (_, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherKeys.attempts }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.attempt(id) }),
      ]),
  })
}

/* ------------------------------ Uy vazifalari ------------------------------ */

export function useTeacherHomework() {
  return useQuery({
    queryKey: teacherKeys.homework,
    queryFn: () => getList<Homework>('/Homework/'),
  })
}

export function useSubmissions(homeworkId: number | undefined) {
  return useQuery({
    queryKey: teacherKeys.submissions(homeworkId ?? 0),
    queryFn: () =>
      getList<HomeworkSubmissionDetail>('/Homework/submissions/', { homework: homeworkId }),
    enabled: !!homeworkId,
  })
}

/** O'qituvchining barcha guruhlaridagi topshiriqlar (bosh sahifa: "Tekshirish kerak") */
export function useAllSubmissions() {
  return useQuery({
    queryKey: teacherKeys.allSubmissions,
    queryFn: () => getList<HomeworkSubmissionDetail>('/Homework/submissions/'),
  })
}

/** O'qituvchi guruhlaridagi barcha davomat yozuvlari (qaysi darsga davomat qilinmaganini topish uchun) */
export function useAllAttendance() {
  return useQuery({
    queryKey: teacherKeys.attendanceAll,
    queryFn: () => getList<Attendance>('/Attendance/'),
  })
}

export interface HomeworkPayload {
  lesson: number
  title: string
  description: string
  deadline: string
  max_score: number
  file: File | null
  url: string
}

/** Vazifa + (ixtiyoriy) material: fayl va/yoki havola alohida resurs sifatida */
export function useCreateHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, url, ...data }: HomeworkPayload) => {
      const hw = await customInstance<Homework>({ url: '/Homework/', method: 'POST', data })
      if (file) {
        const form = new FormData()
        form.append('homework', String(hw.id))
        form.append('title', file.name)
        form.append('file', file)
        await customInstance({ url: '/Homework/resources/', method: 'POST', data: form })
      }
      if (url) {
        await customInstance({
          url: '/Homework/resources/',
          method: 'POST',
          data: { homework: hw.id, title: url.replace(/^https?:\/\//, '').slice(0, 200), url },
        })
      }
      return hw
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teacherKeys.homework }),
  })
}

export function useGradeSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      score,
      teacher_comment,
    }: {
      id: number
      homeworkId: number
      score: number
      teacher_comment: string
    }) =>
      customInstance<{ message: string; data: HomeworkSubmissionDetail }>({
        url: `/Homework/submissions/${id}/grade/`,
        method: 'POST',
        data: { score, teacher_comment },
      }),
    onSuccess: (_, { homeworkId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherKeys.submissions(homeworkId) }),
        queryClient.invalidateQueries({ queryKey: teacherKeys.allSubmissions }),
      ]),
  })
}
