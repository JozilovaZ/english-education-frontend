import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Drawer holati: yaratish (`record = null`) yoki tahrirlash (`record = obyekt`).
 *   const drawer = useFormDrawer<Course>()
 *   drawer.openCreate() / drawer.openEdit(course) / drawer.close()
 *
 * `openOnNew` — URL'da `?new=1` bo'lsa yaratish oynasi darhol ochiladi
 * (bosh sahifadagi "Tezkor amallar" havolalari uchun), parametr esa olib tashlanadi.
 */
export function useFormDrawer<T>({ openOnNew = false }: { openOnNew?: boolean } = {}) {
  const [params, setParams] = useSearchParams()
  const wantsNew = openOnNew && params.get('new') === '1'
  const [state, setState] = useState<{ open: boolean; record: T | null }>(() => ({
    open: wantsNew,
    record: null,
  }))

  // Oyna ochildi — parametrni URL'dan olib tashlaymiz (yangilanganda qayta ochilmasin)
  useEffect(() => {
    if (!wantsNew) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('new')
        return next
      },
      { replace: true },
    )
  }, [wantsNew, setParams])

  const openCreate = useCallback(() => setState({ open: true, record: null }), [])
  const openEdit = useCallback((record: T) => setState({ open: true, record }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])

  return {
    open: state.open,
    record: state.record,
    isEdit: state.record !== null,
    openCreate,
    openEdit,
    close,
  }
}
