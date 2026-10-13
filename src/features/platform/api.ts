import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ClientListRetrieve,
  Domain,
  OverviewStatsResponse,
  UserGrowthResponse,
} from '@/shared/api/generated/model'
import { listItems, type ListResponse } from '@/shared/api/list'
import { customInstance } from '@/shared/api/mutator'

/** Platforma (public schema) so'rovlari — faqat asosiy domendagi SuperAdmin uchun */
export const platformKeys = {
  all: ['platform'] as const,
  overview: ['platform', 'overview'] as const,
  growth: (months: number, days: number) => ['platform', 'growth', months, days] as const,
  tenants: ['platform', 'tenants'] as const,
  tenant: (id: number) => ['platform', 'tenants', id] as const,
  tenantStats: (id: number) => ['platform', 'tenants', id, 'stats'] as const,
  tenantUsers: (id: number) => ['platform', 'tenants', id, 'users'] as const,
  domains: ['platform', 'domains'] as const,
}

const BASE = '/PublicTenants'

const get = <T>(url: string, params?: Record<string, unknown>) =>
  customInstance<T>({ url: `${BASE}${url}`, method: 'GET', params })

/* ------------------------------ Statistika ------------------------------ */

export function useOverview() {
  return useQuery({
    queryKey: platformKeys.overview,
    queryFn: () => get<OverviewStatsResponse>('/stats/overview/'),
  })
}

export function useUserGrowth(months = 6, days = 30) {
  return useQuery({
    queryKey: platformKeys.growth(months, days),
    queryFn: () => get<UserGrowthResponse>('/stats/user-growth/', { months, days }),
  })
}

/* ------------------------------ Markazlar ------------------------------ */

export function useTenants() {
  return useQuery({
    queryKey: platformKeys.tenants,
    // `public` — platformaning o'zi, ro'yxatda ko'rsatilmaydi
    queryFn: () =>
      get<ListResponse<ClientListRetrieve>>('/clients/', { exclude_public: true }).then(listItems),
  })
}

export function useTenant(id: number) {
  return useQuery({
    queryKey: platformKeys.tenant(id),
    queryFn: () => get<ClientListRetrieve>(`/clients/${id}/`),
  })
}

export interface TenantStats {
  users: {
    total: number
    active: number
    inactive: number
    joined_this_month: number
    growth_rate_percentage: number
    active_logged_in_this_month: number
  }
  education_metrics: { courses: number; groups: number; exams: number; homeworks: number }
}

export function useTenantStats(id: number) {
  return useQuery({
    queryKey: platformKeys.tenantStats(id),
    queryFn: () => get<TenantStats>(`/clients/${id}/stats/`),
  })
}

export interface TenantUser {
  id: number
  username: string
  phone: string | null
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  date_joined: string
  last_login: string | null
}

export function useTenantUsers(id: number) {
  return useQuery({
    queryKey: platformKeys.tenantUsers(id),
    queryFn: () => get<{ results: TenantUser[] }>(`/clients/${id}/users/`).then((r) => r.results),
  })
}

export interface TenantCreatePayload {
  name: string
  schema_name: string
  paid_until: string
  on_trial: boolean
  domain: string
  admin_username: string
  admin_password: string
  admin_phone: string
  admin_email: string
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TenantCreatePayload) =>
      customInstance<{ id: number }>({
        url: `${BASE}/clients/`,
        method: 'POST',
        data,
        // Yangi schema + barcha migratsiyalar — bir necha soniya, ba'zan ko'proq
        timeout: 120_000,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.all }),
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: { name: string; paid_until: string; on_trial: boolean }
    }) => customInstance({ url: `${BASE}/clients/${id}/`, method: 'PATCH', data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.all }),
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      customInstance<void>({ url: `${BASE}/clients/${id}/`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.all }),
  })
}

export interface TenantAdminPayload {
  username: string
  password: string
  phone: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN'
}

export function useCreateTenantAdmin(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TenantAdminPayload) =>
      customInstance({ url: `${BASE}/clients/${id}/create_admin/`, method: 'POST', data }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: platformKeys.tenantUsers(id) }),
        queryClient.invalidateQueries({ queryKey: platformKeys.tenantStats(id) }),
        queryClient.invalidateQueries({ queryKey: platformKeys.tenants }),
      ]),
  })
}

/* ------------------------------ Domenlar ------------------------------ */

export function useDomains() {
  return useQuery({
    queryKey: platformKeys.domains,
    queryFn: () => get<ListResponse<Domain>>('/domains/').then(listItems),
  })
}

export function useSaveDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: number
      data: { domain: string; tenant: number; is_primary: boolean }
    }) =>
      customInstance<Domain>({
        url: id ? `${BASE}/domains/${id}/` : `${BASE}/domains/`,
        method: id ? 'PATCH' : 'POST',
        data,
      }),
    // Markaz kartochkalaridagi asosiy domen ham o'zgaradi
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.all }),
  })
}

export function useDeleteDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      customInstance<void>({ url: `${BASE}/domains/${id}/`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.all }),
  })
}
