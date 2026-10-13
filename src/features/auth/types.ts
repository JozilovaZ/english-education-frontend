export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const

export type Role = (typeof Role)[keyof typeof Role]

/**
 * `/User/login/` javobi.
 * Diqqat: backend schema.yml da bu javob noto'g'ri tasvirlangan (faqat username/password),
 * shuning uchun tip qo'lda yozilgan.
 */
export interface LoginResponse {
  access: string
  refresh: string
  id: number
  role: Role
  schema_name: string
  username: string
  phone: string | null
  first_name: string
  last_name: string
}

export interface AuthUser {
  id: number
  role: Role
  schemaName: string
  username: string
  phone: string | null
  firstName: string
  lastName: string
}

export const PUBLIC_SCHEMA = 'public'
