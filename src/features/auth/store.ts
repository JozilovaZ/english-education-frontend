import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AuthUser, LoginResponse } from './types'

interface AuthState {
  access: string | null
  refresh: string | null
  user: AuthUser | null
  setSession: (data: LoginResponse) => void
  setAccess: (access: string) => void
  logout: () => void
}

// localStorage brauzerda origin (domen) bo'yicha ajratilgan, shuning uchun
// har bir tenant subdomenida o'z sessiyasi saqlanadi.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,
      user: null,
      setSession: (data) =>
        set({
          access: data.access,
          refresh: data.refresh,
          user: {
            id: data.id,
            role: data.role,
            schemaName: data.schema_name,
            username: data.username,
            phone: data.phone,
            firstName: data.first_name,
            lastName: data.last_name,
          },
        }),
      setAccess: (access) => set({ access }),
      logout: () => set({ access: null, refresh: null, user: null }),
    }),
    {
      name: 'ee-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
