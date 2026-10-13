import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

type Value = string | number | boolean | null | undefined

/**
 * Jadval holatini (qidiruv, filtr, sahifa, saralash) URL query'da saqlaydi:
 * sahifa yangilansa yoki havola ulashilsa holat yo'qolmaydi, "orqaga" tugmasi ishlaydi.
 *
 *   const [state, setState] = useUrlState()
 *   state.get('status')            // "active" | null
 *   setState({ status: 'active' }) // page avtomatik 1 ga qaytadi
 */
export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const update = useCallback(
    (patch: Record<string, Value>, options: { resetPage?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          // Filtr o'zgarsa birinchi sahifaga qaytamiz
          if (options.resetPage ?? !('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [searchParams, update] as const
}

/** URL'dagi qiymatlarni API params obyektiga aylantiradi (bo'sh qiymatlar tashlab yuboriladi) */
export function useUrlParams<K extends string>(keys: readonly K[]): Partial<Record<K, string>> {
  const [searchParams] = useSearchParams()
  const entries = keys
    .map((key) => [key, searchParams.get(key)] as const)
    .filter((entry): entry is readonly [K, string] => Boolean(entry[1]))
  // Barqaror kalit: obyekt faqat kerakli parametrlar o'zgarganda yangilanadi (query key uchun muhim)
  const cacheKey = JSON.stringify(entries)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => Object.fromEntries(entries) as Partial<Record<K, string>>, [cacheKey])
}
