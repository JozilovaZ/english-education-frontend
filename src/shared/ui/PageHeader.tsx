import { ArrowLeftOutlined } from '@ant-design/icons'
import { Breadcrumb, Button, Flex } from 'antd'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

export interface BreadcrumbItem {
  title: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  /** Sarlavha ustidagi kichik yorliq (katta harf): "IELTS Group A · 14 talaba" */
  eyebrow?: ReactNode
  subtitle?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  /** O'ng tomondagi tugmalar */
  extra?: ReactNode
  /** "Orqaga" tugmasi (detail sahifalar uchun) */
  backTo?: string
}

/** Dizayn bo'yicha: eyebrow → Fraunces sarlavha (`.ee-title`) → izoh; o'ngda harakatlar */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  breadcrumbs,
  extra,
  backTo,
}: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 12, fontSize: 13 }}
          items={breadcrumbs.map((b) => ({
            title: b.to ? <Link to={b.to}>{b.title}</Link> : b.title,
          }))}
        />
      )}
      <Flex justify="space-between" align="flex-end" gap={16} wrap>
        <Flex align="flex-start" gap={8} style={{ minWidth: 0 }}>
          {backTo && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(backTo)}
              aria-label="Orqaga"
              style={{ marginTop: eyebrow ? 20 : 0 }}
            />
          )}
          <Flex vertical gap={6} style={{ minWidth: 0 }}>
            {eyebrow && <span className="ee-eyebrow">{eyebrow}</span>}
            <h1 className="ee-title">{title}</h1>
            {subtitle && <span className="ee-muted">{subtitle}</span>}
          </Flex>
        </Flex>
        {extra && (
          <Flex gap={8} wrap>
            {extra}
          </Flex>
        )}
      </Flex>
    </div>
  )
}
