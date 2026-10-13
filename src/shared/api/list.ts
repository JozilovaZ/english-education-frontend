/**
 * Backendda hozircha pagination yo'q (BACKEND_ISSUES #9) — ro'yxatlar massiv qaytadi.
 * DRF PageNumberPagination qo'shilgach shu flagni `true` qiling: jadvallar `page`/`page_size`
 * ni serverga yuboradi va `{count, results}` javobini o'qiydi.
 */
export const SERVER_PAGINATION = false

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type ListResponse<T> = readonly T[] | T[] | Paginated<T>

export function isPaginated<T>(data: ListResponse<T> | undefined): data is Paginated<T> {
  return !!data && !Array.isArray(data) && 'results' in (data as object)
}

/** Select va boshqa joylar uchun: har ikki formatdan massiv olish */
export function listItems<T>(data: ListResponse<T> | undefined): T[] {
  if (!data) return []
  return isPaginated(data) ? data.results : [...data]
}
