/**
 * Holat teglari — uch rang qoidasi bo'yicha 5 tur (src/index.css → .ee-tag--*):
 *  pos  — ijobiy, hammasi yaxshi               (amber, to'ldirilgan, ✓)
 *  prog — jarayonda, kutilmoqda                (chiziqli)
 *  warn — e'tibor kerak, hali muammo emas      (punktir chiziqli)
 *  neg  — muammo, chora kerak                  (ink, to'ldirilgan, ✕)
 *  neu  — yakunlangan yoki betaraf             (och fon)
 */
export type TagVariant = 'pos' | 'prog' | 'warn' | 'neg' | 'neu'

export interface StatusMeta {
  label: string
  variant: TagVariant
}

/** Backend enum qiymatlari → o'zbekcha nom va teg turi. Yangi enum kerak bo'lsa shu yerga qo'shiladi. */
export const STATUS_MAPS = {
  group: {
    recruiting: { label: "O'quvchilar yig'ilmoqda", variant: 'prog' },
    active: { label: 'Faol', variant: 'pos' },
    paused: { label: "To'xtatilgan", variant: 'warn' },
    completed: { label: 'Tugallangan', variant: 'neu' },
    cancelled: { label: 'Bekor qilingan', variant: 'neg' },
  },
  attendance: {
    present: { label: 'Kelgan', variant: 'pos' },
    late: { label: 'Kechikkan', variant: 'warn' },
    absent: { label: 'Kelmagan', variant: 'neg' },
    excused: { label: 'Sababli', variant: 'neu' },
  },
  examResult: {
    passed: { label: "O'tdi", variant: 'pos' },
    in_progress: { label: 'Jarayonda', variant: 'prog' },
    failed: { label: "O'ta olmadi", variant: 'neg' },
    not_started: { label: 'Boshlanmagan', variant: 'neu' },
  },
  // Dizayn bo'yicha: topshirilmagan — chiziqli, tekshirilmoqda — betaraf, baholandi — amber
  homework: {
    graded: { label: 'Baholandi', variant: 'pos' },
    submitted: { label: 'Tekshirilmoqda', variant: 'neu' },
    pending: { label: 'Topshirilmagan', variant: 'prog' },
    overdue: { label: "Muddati o'tgan", variant: 'warn' },
  },
  role: {
    SUPER_ADMIN: { label: 'Markaz egasi', variant: 'pos' },
    ADMIN: { label: 'Admin', variant: 'pos' },
    TEACHER: { label: "O'qituvchi", variant: 'prog' },
    STUDENT: { label: "O'quvchi", variant: 'neu' },
  },
  parentConnection: {
    connected: { label: 'Botga ulangan', variant: 'pos' },
    phone_only: { label: 'Botga ulanmagan', variant: 'warn' },
    not_connected: { label: 'Ulanmagan', variant: 'neu' },
    not_student: { label: '—', variant: 'neu' },
  },
  tenant: {
    active_paid: { label: "To'langan", variant: 'pos' },
    active_trial: { label: 'Sinov muddati', variant: 'prog' },
    expired: { label: 'Muddati tugagan', variant: 'neg' },
  },
} satisfies Record<string, Record<string, StatusMeta>>

export type StatusKind = keyof typeof STATUS_MAPS

/** Select uchun variantlar: <Select options={statusOptions('group')} /> */
export function statusOptions(kind: StatusKind) {
  return Object.entries(STATUS_MAPS[kind] as Record<string, StatusMeta>).map(([value, meta]) => ({
    value,
    label: meta.label,
  }))
}
