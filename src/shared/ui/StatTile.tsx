import type { ReactNode } from 'react'
import { Link } from 'react-router'

export type StatTone = 'plain' | 'accent' | 'ink'

interface StatTileProps {
  label: string
  value: ReactNode
  /** Raqam yonidagi kichik matn: "/ 15", "o'rin" */
  suffix?: ReactNode
  /**
   * `accent` / `ink` — muhim ko'rsatkich: binafsha nur bilan ajratiladi.
   * Kartochkalarda faqat bitta rang (binafsha) — foydalanuvchi talabi.
   */
  tone?: StatTone
  /** Doira ichidagi belgi (antd icon) */
  icon?: ReactNode
  /** Raqam ostidagi izoh: "shu oyda +12" */
  hint?: ReactNode
  /** Berilsa kartochka havola bo'ladi (masalan, filtrlangan ro'yxatga) */
  to?: string
  /** Burchaklari butunlay yumaloq kartochka */
  rounded?: boolean
}

/** Ko'rsatkich kartochkasi: binafsha belgi + yorliq + katta raqam + izoh */
export function StatTile({
  label,
  value,
  suffix,
  tone = 'plain',
  icon,
  hint,
  to,
  rounded,
}: StatTileProps) {
  const violet = tone !== 'plain' || Boolean(icon)
  const className = `ee-panel ee-stat${violet ? ' ee-stat--violet' : ''}${to ? ' ee-stat--link' : ''}${rounded ? ' ee-stat--rounded' : ''}`
  const body = (
    <>
      {icon && (
        <span className="ee-stat__icon" aria-hidden>
          {icon}
        </span>
      )}
      <span className="ee-stat__body">
        <span className="ee-stat__label">{label}</span>
        <span className="ee-stat-value ee-num">
          {value}
          {suffix !== undefined && <span className="ee-stat__suffix">{suffix}</span>}
        </span>
        {hint && <span className="ee-stat__hint">{hint}</span>}
      </span>
    </>
  )
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/** Kartochkalar qatori: kengligiga qarab 4/2/1 ustun */
export function StatRow({ children, min = 220 }: { children: ReactNode; min?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
        gap: 20,
      }}
    >
      {children}
    </div>
  )
}
