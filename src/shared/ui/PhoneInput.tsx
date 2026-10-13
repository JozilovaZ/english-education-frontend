import { Input, type InputRef } from 'antd'
import { useLayoutEffect, useRef } from 'react'

import { inputToLocal, valueToLocal } from './phoneDigits'

const PREFIX = '+998'

/** "901234567" → "90 123 45 67" */
function formatLocal(digits: string): string {
  const d = digits.slice(0, 9)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
}

/** Formatlangan matnda `count` ta raqamdan keyingi kursor o'rni */
function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === count) return i + 1
  }
  return formatted.length
}

interface PhoneInputProps {
  /** Backend formati: "+998901234567" */
  value?: string | null
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * O'zbekiston telefon raqami: foydalanuvchi "90 123 45 67" ko'rinishida kiritadi,
 * formaga "+998901234567" qaytadi (backend PhoneNumberField shu formatni kutadi).
 * To'liq raqamni nusxalab qo'yish ham mumkin. Validatsiya uchun `phoneRules` dan foydalaning.
 */
export function PhoneInput({
  value,
  onChange,
  disabled,
  placeholder = '90 123 45 67',
}: PhoneInputProps) {
  const ref = useRef<InputRef>(null)
  // O'rtadan tahrirlanganda kursor oxiriga sakramasligi uchun: nechta raqamdan keyin turishi kerak
  const pendingCaret = useRef<number | null>(null)
  const display = formatLocal(valueToLocal(value))

  // Har renderdan keyin: matn o'zgarmagan bo'lsa ham React kursorni oxiriga qo'yadi
  useLayoutEffect(() => {
    const el = ref.current?.input
    if (pendingCaret.current === null || !el || document.activeElement !== el) return
    const pos = caretAfterDigits(display, pendingCaret.current)
    el.setSelectionRange(pos, pos)
    pendingCaret.current = null
  })

  return (
    <Input
      ref={ref}
      prefix={<span style={{ color: 'var(--ant-color-text-secondary)' }}>{PREFIX}</span>}
      value={display}
      onChange={(e) => {
        let text = e.target.value
        let caret = e.target.selectionStart ?? text.length
        // Bo'sh joy o'chirilgan bo'lsa (raqamlar o'zgarmagan) — undan oldingi raqam o'chiriladi
        const prevDigits = display.replace(/\D/g, '')
        if (text.length < display.length && text.replace(/\D/g, '') === prevDigits && caret > 0) {
          text = text.slice(0, caret - 1) + text.slice(caret)
          caret -= 1
        }
        const typed = text.replace(/\D/g, '')
        const local = inputToLocal(text)
        const digits = local.slice(0, 9)
        // To'liq raqam qo'yilganda kursor oxirida; aks holda kursordan oldingi raqamlar soni
        pendingCaret.current =
          local.length !== typed.length
            ? digits.length
            : Math.min(text.slice(0, caret).replace(/\D/g, '').length, digits.length)
        onChange?.(digits ? `${PREFIX}${digits}` : '')
      }}
      inputMode="tel"
      autoComplete="tel"
      disabled={disabled}
      placeholder={placeholder}
    />
  )
}
