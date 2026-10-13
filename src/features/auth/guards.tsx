import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { getUserArea, type Area } from './home'
import { useAuthStore } from './store'
import type { Role } from './types'

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

export function RequireArea({ area, children }: { area: Area; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || getUserArea(user) !== area) {
    return <Navigate to="/403" replace />
  }
  return children
}

/** Bo'lim ichida faqat ayrim rollarga ochiq sahifalar uchun */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }
  return children
}

/** `/` ga kirganda foydalanuvchini o'z bo'limiga yo'naltiradi */
export function HomeRedirect() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  const area = getUserArea(user)
  return <Navigate to={area ? `/${area}` : '/403'} replace />
}
