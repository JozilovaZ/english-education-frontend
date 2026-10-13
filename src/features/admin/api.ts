import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  Course,
  ExamAttemptDetail,
  ExamModels,
  Group,
  GroupStatistics,
  GroupStudent,
  ParentSerializers,
  Role45dEnum,
  Schedule,
  StatusA5aEnum,
  User,
  UserParentStatus,
} from '@/shared/api/generated/model'
import { listItems, type ListResponse } from '@/shared/api/list'
import { customInstance } from '@/shared/api/mutator'

/**
 * Admin bo'limi so'rovlari. Ba'zi filtrlar (`?status=`, `?group=`) schema.yml da yo'q,
 * shuning uchun generatsiya qilingan hooklar o'rniga shu yerda yozilgan.
 */
export const adminKeys = {
  users: ['admin', 'users'] as const,
  parentStatus: (userId: number) => ['admin', 'users', userId, 'parent-status'] as const,
  courses: ['admin', 'courses'] as const,
  groups: ['admin', 'groups'] as const,
  group: (id: number) => ['admin', 'groups', id] as const,
  groupStudents: (id: number) => ['admin', 'groups', id, 'students'] as const,
  statistics: ['admin', 'groups', 'statistics'] as const,
  schedules: ['admin', 'schedules'] as const,
  parents: ['admin', 'parents'] as const,
  exams: ['admin', 'exams'] as const,
  attempts: ['admin', 'exams', 'attempts'] as const,
}

const getList = <T>(url: string, params?: Record<string, unknown>) =>
  customInstance<ListResponse<T>>({ url, method: 'GET', params }).then(listItems)

/* ------------------------------ Foydalanuvchilar ------------------------------ */

export function useUsers() {
  return useQuery({ queryKey: adminKeys.users, queryFn: () => getList<User>('/User/') })
}

/** `/User/?role=` filtri backendda yo'q — ro'yxatdan ajratib olinadi */
export function useUsersByRole(role: Role45dEnum) {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => getList<User>('/User/'),
    select: (list) => list.filter((u) => u.role === role && u.is_active !== false),
  })
}

export interface UserPayload {
  username?: string
  phone: string
  first_name: string
  last_name: string
  email: string
  role: Role45dEnum
  is_active?: boolean
  password?: string
}

export function useSaveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: UserPayload }) =>
      customInstance<User>({
        url: id ? `/User/${id}/` : '/User/',
        method: id ? 'PATCH' : 'POST',
        data,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => customInstance<void>({ url: `/User/${id}/`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  })
}

/** Talabaning ota-onasi botga ulanganmi. Qatorga kerak bo'lganda so'raladi (N+1 dan qochish uchun) */
export function useParentStatus(userId: number, enabled = true) {
  return useQuery({
    queryKey: adminKeys.parentStatus(userId),
    queryFn: () =>
      customInstance<UserParentStatus>({ url: `/User/${userId}/parent-status/`, method: 'GET' }),
    enabled,
    staleTime: 60_000,
    // 404 — ota-ona biriktirilmagan: qayta urinish shart emas
    retry: false,
  })
}

/* ------------------------------ Kurslar ------------------------------ */

/** Backend: kurslar ro'yxati faqat SUPER_ADMIN uchun (BACKEND_ISSUES #6). ADMIN uchun bo'sh qaytadi */
export function useCourses(enabled = true) {
  return useQuery({
    queryKey: adminKeys.courses,
    queryFn: () => getList<Course>('/Educations/courses/'),
    enabled,
  })
}

/* ------------------------------ Guruhlar ------------------------------ */

export function useGroups() {
  return useQuery({
    queryKey: adminKeys.groups,
    queryFn: () => getList<Group>('/Educations/groups/'),
  })
}

export function useGroup(id: number) {
  return useQuery({
    queryKey: adminKeys.group(id),
    queryFn: () => customInstance<Group>({ url: `/Educations/groups/${id}/`, method: 'GET' }),
  })
}

export function useGroupStatistics() {
  return useQuery({
    queryKey: adminKeys.statistics,
    queryFn: () =>
      customInstance<GroupStatistics>({ url: '/Educations/groups/statistics/', method: 'GET' }),
  })
}

export interface GroupPayload {
  name: string
  course: number
  teacher: number
  start_date?: string
  capacity: number
  status: StatusA5aEnum
}

export function useSaveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: GroupPayload }) =>
      customInstance<Group>({
        url: id ? `/Educations/groups/${id}/` : '/Educations/groups/',
        method: id ? 'PATCH' : 'POST',
        data,
      }),
    // Prefiks: ro'yxat, guruh sahifasi va statistika birga yangilanadi
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.groups }),
  })
}

/** Barcha a'zoliklar, chiqib ketganlar ham (`left_at`) — tarix uchun */
export function useGroupStudents(id: number) {
  return useQuery({
    queryKey: adminKeys.groupStudents(id),
    queryFn: () => getList<GroupStudent>(`/Educations/groups/${id}/students/`),
  })
}

export function useGroupMembership(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ action, studentId }: { action: 'add' | 'remove'; studentId: number }) =>
      customInstance<{ detail: string }>({
        url: `/Educations/groups/${groupId}/${action}-student/`,
        method: 'POST',
        data: { student_id: studentId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.groups }),
  })
}

/* ------------------------------ Dars jadvali ------------------------------ */

export function useSchedules() {
  return useQuery({
    queryKey: adminKeys.schedules,
    queryFn: () => getList<Schedule>('/Educations/schedules/'),
  })
}

export interface SchedulePayload {
  group: number
  day_of_week: Schedule['day_of_week']
  start_time: string
  end_time: string
  room: string
}

export function useSaveSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: SchedulePayload }) =>
      customInstance<Schedule>({
        url: id ? `/Educations/schedules/${id}/` : '/Educations/schedules/',
        method: id ? 'PATCH' : 'POST',
        data,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.schedules }),
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      customInstance<void>({ url: `/Educations/schedules/${id}/`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.schedules }),
  })
}

/* ------------------------------ Ota-onalar ------------------------------ */

export function useParents() {
  return useQuery({
    queryKey: adminKeys.parents,
    queryFn: () => getList<ParentSerializers>('/Parents/'),
  })
}

export interface ParentPayload {
  full_name: string
  phone: string
  user: number
}

export function useSaveParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: ParentPayload }) =>
      customInstance<ParentSerializers>({
        url: id ? `/Parents/${id}/` : '/Parents/',
        method: id ? 'PATCH' : 'POST',
        data,
      }),
    onSuccess: (_, { data }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.parents }),
        queryClient.invalidateQueries({ queryKey: adminKeys.parentStatus(data.user) }),
      ]),
  })
}

export function useDeleteParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => customInstance<void>({ url: `/Parents/${id}/`, method: 'DELETE' }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.parents }),
        queryClient.invalidateQueries({ queryKey: adminKeys.users }),
      ]),
  })
}

/* ------------------------------ Imtihonlar ------------------------------ */

export type AdminExam = Omit<ExamModels, 'questions' | 'my_attempt'>

export function useAdminExams() {
  return useQuery({ queryKey: adminKeys.exams, queryFn: () => getList<AdminExam>('/Exams/') })
}

/** Barcha imtihon urinishlari (admin hammasini ko'radi) — topshirdi/o'tdi sonlari uchun */
export function useAdminAttempts() {
  return useQuery({
    queryKey: adminKeys.attempts,
    queryFn: () => getList<ExamAttemptDetail>('/Exams/attempts/'),
  })
}

/**
 * Har bir o'quvchi qaysi guruhlarda (faol a'zolik). Backendda umumiy endpoint yo'q —
 * guruhlar bo'yicha so'raladi (kesh guruh sahifasi bilan umumiy).
 */
export function useStudentGroups(groups: Group[] | undefined) {
  return useQueries({
    queries: (groups ?? []).map((g) => ({
      queryKey: adminKeys.groupStudents(g.id),
      queryFn: () => getList<GroupStudent>(`/Educations/groups/${g.id}/students/`),
      staleTime: 60_000,
    })),
    combine: (results) => {
      const map = new Map<number, Group[]>()
      results.forEach((r, i) => {
        for (const m of r.data ?? []) {
          if (m.left_at) continue
          map.set(m.student_id, [...(map.get(m.student_id) ?? []), groups![i]])
        }
      })
      return map
    },
  })
}
