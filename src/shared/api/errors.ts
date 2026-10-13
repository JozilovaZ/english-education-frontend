import { isAxiosError } from 'axios'

export interface ParsedApiError {
  /** Umumiy xabar (toast uchun) */
  message: string
  /** Maydon bo'yicha xatolar (forma uchun): { phone: "..." } */
  fieldErrors: Record<string, string>
}

const NETWORK_MESSAGE = "Server bilan aloqa yo'q. Internetni tekshiring."
const FALLBACK_MESSAGE = 'Kutilmagan xatolik yuz berdi.'

function toText(value: unknown): string {
  if (Array.isArray(value)) return value.map(toText).join(' ')
  if (value && typeof value === 'object') return Object.values(value).map(toText).join(' ')
  return String(value ?? '')
}

/**
 * Backend xatolarini bitta formatga keltiradi. Backend quyidagilarni qaytaradi:
 *  - { "detail": "matn" }
 *  - { "detail": { "field": ["matn"] } }   (Django ValidationError, core/exceptions.py)
 *  - { "field": ["matn"], "non_field_errors": ["matn"] }   (DRF serializer)
 */
export function parseApiError(error: unknown): ParsedApiError {
  if (!isAxiosError(error)) return { message: FALLBACK_MESSAGE, fieldErrors: {} }
  if (!error.response) return { message: NETWORK_MESSAGE, fieldErrors: {} }

  const data = error.response.data as unknown
  const fieldErrors: Record<string, string> = {}
  const general: string[] = []

  const collect = (obj: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'detail' && value && typeof value === 'object' && !Array.isArray(value)) {
        collect(value as Record<string, unknown>)
      } else if (key === 'detail' || key === 'non_field_errors' || key === '__all__') {
        general.push(toText(value))
      } else {
        fieldErrors[key] = toText(value)
      }
    }
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    collect(data as Record<string, unknown>)
  } else if (Array.isArray(data)) {
    general.push(toText(data))
  }

  const message =
    general.join(' ') ||
    Object.values(fieldErrors)[0] ||
    (error.response.status >= 500 ? 'Serverda xatolik yuz berdi.' : FALLBACK_MESSAGE)

  return { message, fieldErrors }
}
