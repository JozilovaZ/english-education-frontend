import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'

import { AreaLayout } from '@/app/layouts/AreaLayout'
import { AREAS } from '@/app/navigation/areas'
import { HomeRedirect, RequireArea, RequireAuth, RequireRole } from '@/features/auth/guards'
import type { Area } from '@/features/auth/home'
import { LoginPage } from '@/features/auth/LoginPage'
import { ForbiddenPage, NotFoundPage } from '@/pages/ErrorPages'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

/**
 * Sahifani alohida chunk qilib yuklaydi (named export uchun).
 * Modul darajasida bir marta chaqiriladi — render ichida chaqirmang (har safar yangi lazy bo'ladi).
 */
function page<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  // oxlint-disable-next-line react/only-export-components -- lazy komponent modul darajasida bir marta yaratiladi
  const Component = lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })))
  return <Component />
}

const profilePage = page(() => import('@/features/profile/ProfilePage'), 'ProfilePage')
const changePasswordPage = page(
  () => import('@/features/profile/ChangePasswordPage'),
  'ChangePasswordPage',
)

/**
 * Har bir bo'limning yozilgan sahifalari. Kalit — menyudagi `path` (areas.tsx).
 * Ichki sahifalar (masalan, `groups/:id`) uchun ham shu yerga qo'shiladi.
 * Ro'yxatda yo'q menyu bandlari vaqtincha PlaceholderPage bilan ochiladi.
 */
const AREA_PAGES: Partial<Record<Area, Record<string, ReactNode>>> = {
  platform: {
    '': page(() => import('@/features/platform/PlatformHomePage'), 'PlatformHomePage'),
    tenants: page(() => import('@/features/platform/tenants/TenantsPage'), 'TenantsPage'),
    'tenants/:id': page(
      () => import('@/features/platform/tenants/TenantDetailPage'),
      'TenantDetailPage',
    ),
    domains: page(() => import('@/features/platform/domains/DomainsPage'), 'DomainsPage'),
  },
  admin: {
    '': page(() => import('@/features/admin/AdminHomePage'), 'AdminHomePage'),
    users: page(() => import('@/features/admin/users/UsersPage'), 'UsersPage'),
    courses: page(() => import('@/features/courses/CoursesPage'), 'CoursesPage'),
    groups: page(() => import('@/features/admin/groups/GroupsPage'), 'GroupsPage'),
    'groups/:id': page(() => import('@/features/admin/groups/GroupDetailPage'), 'GroupDetailPage'),
    schedules: page(() => import('@/features/admin/schedules/SchedulesPage'), 'SchedulesPage'),
    parents: page(() => import('@/features/admin/parents/ParentsPage'), 'ParentsPage'),
    exams: page(() => import('@/features/admin/exams/AdminExamsPage'), 'AdminExamsPage'),
  },
  teacher: {
    '': page(() => import('@/features/teacher/TeacherHomePage'), 'TeacherHomePage'),
    exams: page(() => import('@/features/teacher/exams/TeacherExamsPage'), 'TeacherExamsPage'),
    'exams/:id/questions': page(
      () => import('@/features/teacher/exams/QuestionBuilderPage'),
      'QuestionBuilderPage',
    ),
    results: page(() => import('@/features/teacher/results/AttemptsPage'), 'AttemptsPage'),
    'results/:id': page(() => import('@/features/teacher/results/GradePage'), 'GradePage'),
    homework: page(
      () => import('@/features/teacher/homework/TeacherHomeworkPage'),
      'TeacherHomeworkPage',
    ),
    groups: page(() => import('@/features/teacher/groups/TeacherGroupsPage'), 'TeacherGroupsPage'),
    'groups/:id': page(
      () => import('@/features/teacher/groups/TeacherGroupDetailPage'),
      'TeacherGroupDetailPage',
    ),
    lessons: page(
      () => import('@/features/teacher/lessons/TeacherLessonsPage'),
      'TeacherLessonsPage',
    ),
    attendance: page(
      () => import('@/features/teacher/attendance/TeacherAttendancePage'),
      'TeacherAttendancePage',
    ),
    materials: page(
      () => import('@/features/teacher/materials/TeacherMaterialsPage'),
      'TeacherMaterialsPage',
    ),
  },
  student: {
    '': page(() => import('@/features/student/StudentHomePage'), 'StudentHomePage'),
    exams: page(() => import('@/features/student/exams/StudentExamsPage'), 'StudentExamsPage'),
    homework: page(
      () => import('@/features/student/homework/StudentHomeworkPage'),
      'StudentHomeworkPage',
    ),
    'exams/:id': page(() => import('@/features/student/exams/ExamStartPage'), 'ExamStartPage'),
    'exams/:id/result': page(
      () => import('@/features/student/exams/ExamResultPage'),
      'ExamResultPage',
    ),
    results: page(
      () => import('@/features/student/exams/StudentResultsPage'),
      'StudentResultsPage',
    ),
    materials: page(
      () => import('@/features/student/materials/StudentMaterialsPage'),
      'StudentMaterialsPage',
    ),
    attendance: page(
      () => import('@/features/student/attendance/StudentAttendancePage'),
      'StudentAttendancePage',
    ),
  },
}

/**
 * Menyusiz to'liq ekran sahifalar (bo'lim layout'idan tashqarida, lekin o'sha rol uchun).
 * Imtihon ishlash: chap ustunda faqat imtihon nomi va taymer — chalg'ituvchi menyu yo'q.
 */
const FOCUSED_PAGES: { area: Area; path: string; element: ReactNode }[] = [
  {
    area: 'student',
    path: 'exams/:id/take',
    element: page(() => import('@/features/student/exams/ExamTakingPage'), 'ExamTakingPage'),
  },
]

function areaRoutes(area: Area): RouteObject {
  const pages = AREA_PAGES[area] ?? {}
  const menuPaths = new Set(AREAS[area].items.map((item) => item.path))

  // Menyu bandlari: yozilgan sahifa yoki placeholder; `roles` bo'lsa himoyalanadi
  const menuRoutes: RouteObject[] = AREAS[area].items.map((item) => {
    const content = pages[item.path] ?? <PlaceholderPage title={item.label} />
    const element = item.roles ? <RequireRole roles={item.roles}>{content}</RequireRole> : content
    return item.path ? { path: item.path, element } : { index: true, element }
  })

  // Menyuda yo'q ichki sahifalar (masalan, `groups/:id`)
  const innerRoutes: RouteObject[] = Object.entries(pages)
    .filter(([path]) => !menuPaths.has(path))
    .map(([path, element]) => ({ path, element }))

  return {
    path: `/${area}`,
    element: (
      <RequireAuth>
        <RequireArea area={area}>
          <AreaLayout area={area} />
        </RequireArea>
      </RequireAuth>
    ),
    children: [
      ...menuRoutes,
      ...innerRoutes,
      { path: 'profile', element: profilePage },
      { path: 'password', element: changePasswordPage },
      { path: '*', element: <NotFoundPage /> },
    ],
  }
}

const AREA_KEYS = Object.keys(AREAS) as Area[]

// Komponentlar galereyasi — faqat ishlab chiqishda (production build'ga kirmaydi)
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        element: page(() => import('@/features/dev/UiGalleryPage'), 'UiGalleryPage'),
      },
    ]
  : []

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  ...devRoutes,
  { path: '/403', element: <ForbiddenPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <HomeRedirect />
      </RequireAuth>
    ),
  },
  ...FOCUSED_PAGES.map(({ area, path, element }) => ({
    path: `/${area}/${path}`,
    element: (
      <RequireAuth>
        <RequireArea area={area}>
          <Suspense fallback={null}>{element}</Suspense>
        </RequireArea>
      </RequireAuth>
    ),
  })),
  ...AREA_KEYS.map(areaRoutes),
  { path: '*', element: <NotFoundPage /> },
])
