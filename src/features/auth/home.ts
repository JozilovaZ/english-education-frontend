import { PUBLIC_SCHEMA, Role, type AuthUser } from './types'

export type Area = 'platform' | 'admin' | 'teacher' | 'student'

/**
 * Foydalanuvchi qaysi bo'limga tegishli ekanini aniqlaydi.
 *  - public schema'dagi SuperAdmin → platforma boshqaruvi
 *  - tenant ichidagi SUPER_ADMIN (markaz egasi) va ADMIN → admin panel
 */
export function getUserArea(user: AuthUser): Area | null {
  if (user.schemaName === PUBLIC_SCHEMA) {
    return user.role === Role.SUPER_ADMIN ? 'platform' : null
  }
  switch (user.role) {
    case Role.SUPER_ADMIN:
    case Role.ADMIN:
      return 'admin'
    case Role.TEACHER:
      return 'teacher'
    case Role.STUDENT:
      return 'student'
    default:
      return null
  }
}
