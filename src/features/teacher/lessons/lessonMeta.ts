import dayjs from 'dayjs'

import type { Lesson } from '@/shared/api/generated/model'
import type { TagVariant } from '@/shared/ui'

export type LessonState = 'done' | 'now' | 'today' | 'upcoming'

/** Backend `is_lesson_completed` bilan bir xil: sana + tugash vaqti o'tgan bo'lsa — o'tilgan */
export function lessonEnd(lesson: Pick<Lesson, 'date' | 'end_time'>) {
  return dayjs(`${lesson.date}T${lesson.end_time}`)
}

export function lessonState(lesson: Lesson, now = dayjs()): LessonState {
  if (!now.isBefore(lessonEnd(lesson))) return 'done'
  if (!dayjs(lesson.date).isSame(now, 'day')) return 'upcoming'
  return now.isBefore(dayjs(`${lesson.date}T${lesson.start_time}`)) ? 'today' : 'now'
}

export const LESSON_STATE: Record<LessonState, { label: string; variant: TagVariant }> = {
  done: { label: "O'tilgan", variant: 'neu' },
  now: { label: 'Hozir', variant: 'pos' },
  today: { label: 'Bugun', variant: 'prog' },
  upcoming: { label: 'Rejada', variant: 'prog' },
}

/** Davomat faqat boshlangan yoki o'tgan darsga qilinadi */
export const canMarkAttendance = (lesson: Lesson) =>
  !dayjs().isBefore(dayjs(`${lesson.date}T${lesson.start_time}`))

export const lessonLabel = (l: Lesson) => `${l.group_name} · ${l.lesson_number}-dars — ${l.title}`

/** Yangi darsdan boshlab: sana bo'yicha kamayish tartibida */
export const byDateDesc = (a: Lesson, b: Lesson) =>
  b.date.localeCompare(a.date) ||
  b.start_time.localeCompare(a.start_time) ||
  b.lesson_number - a.lesson_number

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
