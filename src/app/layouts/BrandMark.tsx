import { ReadOutlined } from '@ant-design/icons'

interface BrandMarkProps {
  /** Faqat belgi (yig'ilgan menyu uchun) */
  compact?: boolean
  /** Menyu yoki login chap paneli ichida (menyu ranglaridan foydalanadi) */
  onDark?: boolean
}

/** Logo: binafsha gradient kvadrat ichida kitob belgisi + nom va kichik izoh */
export function BrandMark({ compact, onDark }: BrandMarkProps) {
  const strong = onDark ? 'var(--ee-sider-strong)' : 'var(--ee-text)'
  const muted = onDark ? 'var(--ee-sider-text)' : 'var(--ee-text-2)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <i
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          flex: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontStyle: 'normal',
          color: 'var(--ee-white)',
          background: 'linear-gradient(135deg, var(--ee-accent), var(--ee-accent-2))',
          boxShadow: '0 6px 18px var(--ee-tone-violet-glow)',
        }}
      >
        <ReadOutlined />
      </i>
      {!compact && (
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{ font: '800 17px/22px var(--ee-font)', whiteSpace: 'nowrap', color: strong }}
          >
            English Education
          </span>
          <span style={{ fontSize: 11, lineHeight: '14px', color: muted, whiteSpace: 'nowrap' }}>
            O'quv markazlari uchun
          </span>
        </span>
      )}
    </span>
  )
}
