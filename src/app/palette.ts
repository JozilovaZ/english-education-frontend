/**
 * ============================================================================
 *  DIZAYN TIZIMI (namuna: english-education/rasm/img.png — "EduCRM" uslubi)
 *
 *    navy    — sahifa foni va kartochkalar (qorong'i rejim asosiy)
 *    violet  — asosiy rang: tanlangan menyu, asosiy tugma, urg'u, havolalar
 *    holatlar — yashil (yaxshi), pushti-qizil (muammo), to'q sariq (e'tibor), ko'k (ma'lumot)
 *    tonlar  — KPI kartochkalari belgisi uchun gradient juftliklar
 *
 *  Rang faqat SHU FAYLDA yoziladi. `npm run lint` boshqa joydagi hex/rgb'ni topadi.
 * ============================================================================
 */
export const BASE = {
  navy: '#0B1126',
  white: '#FFFFFF',
  violet: '#7052F0',
} as const

export type ThemeMode = 'light' | 'dark'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

/** `a` va `b` ranglarini aralashtiradi: t=0 → a, t=1 → b */
export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const out = ca.map((v, i) => Math.round(v * (1 - t) + cb[i] * t))
  return `#${out
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

/** Shaffof variant (soyalar va antd "fill" token'lari uchun) */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** KPI belgilari uchun gradient tonlar (ikkala rejimda bir xil) */
export const TONES = {
  violet: ['#9B7BFF', '#6D3FF0'],
  indigo: ['#8B8CFF', '#5B4FE0'],
  green: ['#34D399', '#059669'],
  pink: ['#F472B6', '#DB2777'],
  orange: ['#FBBF24', '#D97706'],
  sky: ['#38BDF8', '#0284C7'],
} as const
export type Tone = keyof typeof TONES

/**
 * Kategoriyali grafik ranglari — qat'iy tartibda (aylantirilmaydi).
 * dataviz validator: qorong'i (#121A33) va yorug' fonda lightness/chroma/kontrast PASS,
 * CVD 7.6 — shuning uchun legenda va bo'laklar orasida 2px oraliq majburiy.
 */
export const CHART = ['#8B5CF6', '#059669', '#D97706', '#EC4899', '#0284C7'] as const

export interface Palette {
  mode: ThemeMode
  /** Sahifa foni */
  bg: string
  /** Kartochka, jadval, forma foni */
  surface: string
  /** Ichki maydonlar: input foni, jadval sarlavhasi, hover */
  surfaceMuted: string
  /** Kartochka chegarasi, ajratuvchi chiziq — dekorativ */
  border: string
  /** Input chegarasi (≥ 3:1) */
  borderStrong: string
  /** Asosiy matn */
  text: string
  /** Ikkinchi darajali matn (≥ 4.5:1) */
  text2: string
  /** Placeholder, o'chirilgan elementlar (≥ 3:1) */
  text3: string
  /** Asosiy (binafsha) rang: tugma, tanlangan band */
  accent: string
  /** Gradient ikkinchi uchi */
  accent2: string
  accentHover: string
  accentActive: string
  /** Binafsha ustidagi matn */
  onAccent: string
  /** Urg'u matni (havola, ism) — fonda o'qiladigan binafsha */
  accentText: string
  /** Tanlangan qator / yumshoq binafsha fon */
  accentSoft: string
  accentLine: string
  /** Betaraf teg foni va chegarasi */
  inkSoft: string
  inkLine: string
  /** Holatlar: asosiy rang, yumshoq fon, fondagi matn */
  success: string
  successSoft: string
  successText: string
  danger: string
  dangerSoft: string
  dangerText: string
  warning: string
  warningSoft: string
  warningText: string
  info: string
  infoSoft: string
  infoText: string
  /** Chap menyu */
  sider: string
  siderStrong: string
  siderText: string
  siderHoverBg: string
  siderBorder: string
  /** Kartochka soyasi */
  shadow: string
}

/** Kontrast (WCAG 2.1): `npm run check:contrast` */
export function getPalette(mode: ThemeMode): Palette {
  if (mode === 'dark') {
    const surface = '#111933'
    return {
      mode,
      bg: BASE.navy,
      surface,
      surfaceMuted: '#18213F',
      border: '#222C4D',
      borderStrong: '#5E6B9C',
      text: '#EEF1FA',
      text2: '#A3ACCB',
      text3: '#7882A6',
      accent: BASE.violet,
      accent2: '#5B3FE0',
      accentHover: '#7E62F7',
      accentActive: '#6A48F0',
      onAccent: BASE.white,
      accentText: '#B4A3FF',
      accentSoft: mix(surface, BASE.violet, 0.2),
      accentLine: mix(surface, BASE.violet, 0.55),
      inkSoft: '#1C2547',
      inkLine: '#5E6B9C',
      success: '#10B981',
      successSoft: mix(surface, '#10B981', 0.18),
      successText: '#4ADE9F',
      danger: '#F43F5E',
      dangerSoft: mix(surface, '#F43F5E', 0.18),
      dangerText: '#FF8FA3',
      warning: '#F59E0B',
      warningSoft: mix(surface, '#F59E0B', 0.18),
      warningText: '#FCC65A',
      info: '#3B82F6',
      infoSoft: mix(surface, '#3B82F6', 0.18),
      infoText: '#8DB8FF',
      sider: '#0E1530',
      siderStrong: BASE.white,
      siderText: '#A3ACCB',
      siderHoverBg: '#18213F',
      siderBorder: '#222C4D',
      shadow: alpha('#000000', 0.35),
    }
  }
  const surface = BASE.white
  return {
    mode,
    bg: '#F4F5FB',
    surface,
    surfaceMuted: '#F1F2F8',
    border: '#E4E7F1',
    borderStrong: '#858EAD',
    text: '#141A33',
    text2: '#545D7E',
    text3: '#7F88A6',
    accent: '#6D4AFF',
    accent2: '#5233E0',
    accentHover: '#7E5FFF',
    accentActive: '#5B3AF0',
    onAccent: BASE.white,
    accentText: '#5636E8',
    accentSoft: mix(surface, '#6D4AFF', 0.1),
    accentLine: mix(surface, '#6D4AFF', 0.4),
    inkSoft: '#EEF0F7',
    inkLine: '#858EAD',
    success: '#10B981',
    successSoft: mix(surface, '#10B981', 0.14),
    successText: '#047857',
    danger: '#E11D48',
    dangerSoft: mix(surface, '#E11D48', 0.12),
    dangerText: '#BE123C',
    warning: '#F59E0B',
    warningSoft: mix(surface, '#F59E0B', 0.16),
    warningText: '#9A4A06',
    info: '#3B82F6',
    infoSoft: mix(surface, '#3B82F6', 0.12),
    infoText: '#1D4ED8',
    sider: BASE.white,
    siderStrong: '#141A33',
    siderText: '#545D7E',
    siderHoverBg: '#F1F2F8',
    siderBorder: '#E4E7F1',
    shadow: alpha('#141A33', 0.06),
  }
}

/** Interfeys matni va sarlavhalar */
export const FONT_FAMILY =
  "'Manrope Variable', system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', sans-serif"
/** Sarlavhalar ham Manrope'da (namuna dizaynda serif yo'q) */
export const FONT_SERIF = FONT_FAMILY
/** Vaqt va raqamlar — o'sha shrift, tabular raqamlar bilan */
export const FONT_MONO = FONT_FAMILY

/**
 * Antd'dan tashqari komponentlar (teglar, sidebar, KPI, grafik) uchun CSS o'zgaruvchilar.
 * `<html>` ga yoziladi: var(--ee-accent) va h.k.
 */
export function paletteCssVars(p: Palette): Record<string, string> {
  const vars: Record<string, string> = {
    '--ee-bg': p.bg,
    '--ee-surface': p.surface,
    '--ee-surface-muted': p.surfaceMuted,
    '--ee-border': p.border,
    '--ee-border-strong': p.borderStrong,
    '--ee-text': p.text,
    '--ee-text-2': p.text2,
    '--ee-text-3': p.text3,
    '--ee-accent': p.accent,
    '--ee-accent-2': p.accent2,
    '--ee-accent-hover': p.accentHover,
    '--ee-on-accent': p.onAccent,
    '--ee-accent-text': p.accentText,
    '--ee-accent-soft': p.accentSoft,
    '--ee-accent-line': p.accentLine,
    '--ee-ink-soft': p.inkSoft,
    '--ee-ink-line': p.inkLine,
    '--ee-success': p.success,
    '--ee-success-soft': p.successSoft,
    '--ee-success-text': p.successText,
    '--ee-danger': p.danger,
    '--ee-danger-soft': p.dangerSoft,
    '--ee-danger-text': p.dangerText,
    '--ee-warning': p.warning,
    '--ee-warning-soft': p.warningSoft,
    '--ee-warning-text': p.warningText,
    '--ee-info': p.info,
    '--ee-info-soft': p.infoSoft,
    '--ee-info-text': p.infoText,
    '--ee-sider': p.sider,
    '--ee-sider-strong': p.siderStrong,
    '--ee-sider-text': p.siderText,
    '--ee-sider-hover': p.siderHoverBg,
    '--ee-sider-border': p.siderBorder,
    '--ee-shadow': p.shadow,
    '--ee-white': BASE.white,
    '--ee-font': FONT_FAMILY,
    '--ee-font-serif': FONT_SERIF,
    '--ee-font-mono': FONT_MONO,
  }
  for (const [name, [a, b]] of Object.entries(TONES)) {
    vars[`--ee-tone-${name}-a`] = a
    vars[`--ee-tone-${name}-b`] = b
    vars[`--ee-tone-${name}-glow`] = alpha(b, p.mode === 'dark' ? 0.55 : 0.28)
  }
  CHART.forEach((c, i) => (vars[`--ee-chart-${i + 1}`] = c))
  return vars
}
