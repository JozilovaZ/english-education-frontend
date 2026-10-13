// Palitradagi barcha matn/fon juftliklari WCAG AA (≥ 4.5:1) talabiga mosligini tekshiradi.
// Ishga tushirish: npm run check:contrast
import { getPalette, type Palette, type ThemeMode } from '../src/app/palette.ts'

function lum(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

type Pair = [label: string, fg: keyof Palette, bg: keyof Palette, min: number]
const PAIRS: Pair[] = [
  ['Matn / fon', 'text', 'bg', 4.5],
  ['Matn / kartochka', 'text', 'surface', 4.5],
  ['Ikkinchi matn / kartochka', 'text2', 'surface', 4.5],
  ['Ikkinchi matn / jadval sarlavhasi', 'text2', 'surfaceMuted', 4.5],
  ['Urg\'u matni / kartochka', 'accentText', 'surface', 4.5],
  ['Matn / tanlangan qator (accent-soft)', 'text', 'accentSoft', 4.5],
  ['Oq matn / binafsha (tugma)', 'onAccent', 'accent', 4.5],
  ['Yashil teg', 'successText', 'successSoft', 4.5],
  ['Qizil teg', 'dangerText', 'dangerSoft', 4.5],
  ['Sariq teg', 'warningText', 'warningSoft', 4.5],
  ['Binafsha teg', 'accentText', 'accentSoft', 4.5],
  ['Kulrang teg', 'text2', 'inkSoft', 4.5],
  ['Kartochka rangi / ink (O\'ta olmadi, primary tugma)', 'surface', 'text', 4.5],
  ['Betaraf teg matni / fon', 'text', 'inkSoft', 4.5],
  ['Menyu matni / menyu', 'siderText', 'sider', 4.5],
  ['Menyu sarlavhasi / menyu', 'siderStrong', 'sider', 4.5],
  ['Input chegarasi / kartochka (≥ 3)', 'borderStrong', 'surface', 3],
  ['Placeholder / kartochka (≥ 3)', 'text3', 'surface', 3],
]

let failed = 0
for (const mode of ['light', 'dark'] as ThemeMode[]) {
  const p = getPalette(mode)
  console.log(`\n${mode === 'light' ? "Yorug'" : "Qorong'i"} rejim`)
  for (const [label, fg, bg, min] of PAIRS) {
    const r = ratio(p[fg] as string, p[bg] as string)
    const ok = r >= min
    if (!ok) failed++
    console.log(`  ${ok ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}  ${label}  (${p[fg]} / ${p[bg]})`)
  }
}
if (failed) {
  console.error(`\n${failed} ta juftlik talabdan past`)
  process.exit(1)
}
