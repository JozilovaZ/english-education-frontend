import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/app/queryClient'
import { http } from '@/shared/api/http'

import { useAuthStore } from './store'
import type { LoginResponse } from './types'

export interface LoginPayload {
  /** Username yoki telefon raqami (+998...) */
  username: string
  password: string
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      http.post<LoginResponse>('/User/login/', payload).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.clear()
      setSession(data)
    },
  })
}

export function logout() {
  useAuthStore.getState().logout()
  queryClient.clear()
}
