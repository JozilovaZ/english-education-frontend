import { SERVER_PAGINATION } from '@/shared/api/list'
import { useUrlParams } from '@/shared/lib/useUrlState'

/**
 * Jadval uchun API parametrlari: qidiruv, saralash va (server pagination yoqilgan bo'lsa) sahifa.
 *   const params = useTableParams(['status', 'course'])
 *   const query = useEducationsGroupsList(params)
 */
export function useTableParams<K extends string>(filterKeys: readonly K[] = []) {
  const keys = [
    'search',
    'ordering',
    ...(SERVER_PAGINATION ? (['page', 'page_size'] as const) : []),
    ...filterKeys,
  ]
  return useUrlParams(keys) as Partial<Record<K | 'search' | 'ordering', string>>
}
