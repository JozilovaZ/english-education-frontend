/**
 * Formadagi qiymat → mahalliy 9 raqam.
 * "+998901234567" | "998901234567" → "901234567". Qisqa qiymat ("+99890") ham to'g'ri:
 * "+998" bu yerda doim davlat kodi, raqamning boshi emas.
 */
export function valueToLocal(value?: string | null): string {
  const raw = value ?? ''
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+')) return digits.startsWith('998') ? digits.slice(3) : digits
  return digits.length === 12 && digits.startsWith('998') ? digits.slice(3) : digits
}

/**
 * Foydalanuvchi yozgan / qo'ygan matn → mahalliy raqamlar.
 * To'liq raqam qo'yilsa ("+998 90 123 45 67", "998901234567") — davlat kodi olib tashlanadi.
 * Mahalliy raqam 998 bilan boshlanishi mumkin ("99 812 34 56"), shuning uchun faqat 9 tadan
 * ko'p raqam bo'lganda olib tashlanadi.
 */
export function inputToLocal(text: string): string {
  const digits = text.replace(/\D/g, '')
  return digits.length > 9 && digits.startsWith('998') ? digits.slice(3) : digits
}
