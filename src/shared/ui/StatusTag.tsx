import type { ReactNode } from 'react'

import { STATUS_MAPS, type StatusKind, type StatusMeta, type TagVariant } from './statusMaps'

interface StatusTagProps {
  kind: StatusKind
  value?: string | null
}

/** Backend holatini o'zbekcha nom va to'g'ri teg turi bilan ko'rsatadi */
export function StatusTag({ kind, value }: StatusTagProps) {
  if (!value) return null
  const meta = (STATUS_MAPS[kind] as Record<string, StatusMeta>)[value]
  return <Tag variant={meta?.variant ?? 'neu'}>{meta?.label ?? value}</Tag>
}

/** Ixtiyoriy matn uchun teg (masalan, "Obuna 7 kunda tugaydi") */
export function Tag({ variant, children }: { variant: TagVariant; children: ReactNode }) {
  return <span className={`ee-tag ee-tag--${variant}`}>{children}</span>
}
