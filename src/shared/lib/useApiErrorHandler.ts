import { App, type FormInstance } from 'antd'
import { useCallback } from 'react'

import { parseApiError } from '@/shared/api/errors'

/**
 * Mutation xatolarini ko'rsatadi:
 *  - forma berilsa, maydon xatolari tegishli inputlar ostida chiqadi
 *  - umumiy xabar toast ko'rinishida chiqadi
 */
export function useApiErrorHandler() {
  const { message } = App.useApp()

  return useCallback(
    (error: unknown, form?: FormInstance) => {
      const { message: text, fieldErrors } = parseApiError(error)
      if (form) {
        // getFieldsError() formada ro'yxatdan o'tgan barcha maydonlarni qaytaradi
        const known = new Set(form.getFieldsError().map((f) => String(f.name[0])))
        const fields = Object.entries(fieldErrors)
          .filter(([name]) => known.has(name))
          .map(([name, err]) => ({ name, errors: [err] }))
        form.setFields(fields)
        if (fields.length && fields.length === Object.keys(fieldErrors).length) return
      }
      message.error(text)
    },
    [message],
  )
}
