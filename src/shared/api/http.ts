import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/features/auth/store'

/**
 * Barcha so'rovlar `/api` orqali ketadi:
 *  - dev: Vite proxy `/api` ni olib tashlab Django'ga yuboradi (vite.config.ts)
 *  - prod: nginx xuddi shunday qiladi
 * So'rov joriy domenga ketgani uchun django-tenants tenantni Host bo'yicha aniqlaydi.
 */
export const http = axios.create({
  baseURL: '/api',
})

http.interceptors.request.use((config) => {
  const { access } = useAuthStore.getState()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

const REFRESH_URL = '/User/token/refresh/'
const AUTH_URLS = ['/User/login/', REFRESH_URL]

// Bir vaqtda bir nechta so'rov 401 olsa, refresh faqat bir marta chaqiriladi.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const { refresh, setAccess } = useAuthStore.getState()
  if (!refresh) throw new Error('Refresh token mavjud emas')

  // `http` emas, toza axios: interceptorlar qayta ishga tushmasligi uchun
  const { data } = await axios.post<{ access: string }>(`/api${REFRESH_URL}`, { refresh })
  setAccess(data.access)
  return data.access
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const isAuthUrl = AUTH_URLS.some((url) => original?.url?.endsWith(url))

    if (error.response?.status !== 401 || !original || original._retried || isAuthUrl) {
      return Promise.reject(error)
    }

    original._retried = true
    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const access = await refreshPromise
      original.headers.Authorization = `Bearer ${access}`
      return http(original)
    } catch {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    }
  },
)
