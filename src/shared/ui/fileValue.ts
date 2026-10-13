/**
 * Formadagi qiymat:
 *  - `File`   — yangi tanlangan fayl (serverga yuboriladi)
 *  - `string` — serverdagi mavjud fayl URL'i (tahrirlashda; qayta yuborilmaydi)
 *  - `null`   — fayl yo'q
 * Yuborishda faqat `instanceof File` bo'lsa fayl qo'shiladi — `fileForSubmit()` ga qarang.
 */
export type FileValue = File | string | null

/** Faqat yangi tanlangan faylni qaytaradi (mavjud URL qayta yuborilmaydi) */
export function fileForSubmit(value: FileValue | undefined): File | undefined {
  return value instanceof File ? value : undefined
}
