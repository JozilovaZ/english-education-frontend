/** Variant harfi: 0 → A, 1 → B … */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}
