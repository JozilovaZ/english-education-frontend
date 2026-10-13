import type { Rule } from 'antd/es/form'

export function phoneRules(required = true): Rule[] {
  return [
    { required, message: 'Telefon raqamini kiriting' },
    {
      validator: (_, value?: string) =>
        !value || /^\+998\d{9}$/.test(value)
          ? Promise.resolve()
          : Promise.reject(new Error("Raqam to'liq emas: +998 XX XXX XX XX")),
    },
  ]
}
