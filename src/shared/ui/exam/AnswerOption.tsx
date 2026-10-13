import type { ReactNode } from 'react'

export type AnswerOptionState = 'idle' | 'selected' | 'correct' | 'wrong'

interface AnswerOptionProps {
  /** Radio guruhi nomi (bitta savol variantlari uchun bir xil) */
  name: string
  value: number | string
  /** A, B, C… */
  letter: string
  state?: AnswerOptionState
  /** Natija ko'rinishi: tanlab bo'lmaydi */
  readOnly?: boolean
  onSelect?: () => void
  children: ReactNode
}

/**
 * Dizayn tizimidagi AnswerOption. Haqiqiy `<input type="radio">` — klaviatura (Tab, strelkalar)
 * va ekran o'quvchilar uchun. To'g'ri / noto'g'ri holat rang bilan emas, belgi va matn bilan ham.
 */
export function AnswerOption({
  name,
  value,
  letter,
  state = 'idle',
  readOnly,
  onSelect,
  children,
}: AnswerOptionProps) {
  const mark = state === 'correct' ? "To'g'ri" : state === 'wrong' ? "Noto'g'ri" : null
  return (
    <label className={`ee-option ee-option--${state}${readOnly ? ' ee-option--readonly' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={state === 'selected' || (!!readOnly && state !== 'idle')}
        onChange={() => onSelect?.()}
        disabled={readOnly}
      />
      <span className="ee-option__dot" aria-hidden>
        {state === 'wrong' ? '✕' : letter}
      </span>
      <span className="ee-option__text">{children}</span>
      {mark && <span className="ee-option__mark">{mark}</span>}
    </label>
  )
}
