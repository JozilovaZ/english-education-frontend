import { Flex, Skeleton, Tooltip } from 'antd'
import { Link } from 'react-router'

import { formatDate } from '@/shared/lib/format'
import { QueryError, StatRow, STATUS_MAPS, StatTile, Tag } from '@/shared/ui'

import { useOverview, useUserGrowth } from './api'
import { isExpiring, monthLabel, subscription } from './tenantMeta'

const ROLE_ORDER = ['STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'] as const

/** Platforma statistikasi: markazlar, foydalanuvchilar, o'sish, tugayotgan obunalar */
export function PlatformHomePage() {
  const overview = useOverview()
  const growthQuery = useUserGrowth(6, 30)

  if (overview.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (overview.isError)
    return <QueryError error={overview.error} onRetry={() => overview.refetch()} />

  const { tenants: t, users: u, per_tenant_summary: list } = overview.data
  const expiring = list.filter(isExpiring).sort((a, b) => a.days_left - b.days_left)
  const expired = list.filter((x) => !x.is_active)

  return (
    <Flex vertical gap={32}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="ee-eyebrow">Platforma boshqaruvi</span>
        <h1 className="ee-display">Statistika</h1>
      </section>

      <StatRow min={220}>
        <StatTile
          rounded
          label="O'quv markazlari"
          value={t.total}
          suffix={`${t.active} faol · ${t.on_trial} sinovda`}
          to="/platform/tenants"
        />
        <StatTile
          rounded
          label="Foydalanuvchilar"
          value={u.total}
          suffix={`+${u.joined_this_month} bu oy`}
          tone="accent"
        />
        <StatTile
          rounded
          label="Obunasi tugayapti"
          value={expiring.length + expired.length}
          suffix={expired.length ? `${expired.length} tasi tugagan` : '30 kun ichida'}
          tone={expiring.length + expired.length > 0 ? 'ink' : 'plain'}
          to="/platform/tenants?status=expiring"
        />
        <StatTile
          rounded
          label="Bu oy faol"
          value={u.active_logged_in_this_month}
          suffix={`/ ${u.total}`}
        />
      </StatRow>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <div
          style={{
            flex: '999 1 520px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <section
            className="ee-panel"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <h2 className="ee-heading">Yangi foydalanuvchilar · oylar bo'yicha</h2>
            {growthQuery.isPending ? (
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            ) : growthQuery.isError ? (
              <QueryError error={growthQuery.error} onRetry={() => growthQuery.refetch()} />
            ) : (
              <MonthlyBars
                items={growthQuery.data.monthly_trend.map((m) => ({
                  label: monthLabel(m.month),
                  value: m.new_users,
                }))}
              />
            )}
          </section>

          <section className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
            <Flex
              justify="space-between"
              align="baseline"
              gap={12}
              style={{ padding: '20px 24px 8px' }}
            >
              <h2 className="ee-heading">Markazlar</h2>
              <Link to="/platform/tenants" style={{ fontWeight: 700, fontSize: 14 }}>
                Barchasi
              </Link>
            </Flex>
            <table className="ee-table ee-table--compact">
              <thead>
                <tr>
                  <th>Markaz</th>
                  <th style={{ textAlign: 'right' }}>Foydalanuvchi</th>
                  <th style={{ textAlign: 'right' }}>Bu oy faol</th>
                  <th>Obuna</th>
                </tr>
              </thead>
              <tbody>
                {[...list]
                  .sort((a, b) => b.total_users - a.total_users)
                  .map((x) => {
                    const sub = subscription(x)
                    return (
                      <tr key={x.id}>
                        <td style={{ minWidth: 180 }}>
                          <Link to={`/platform/tenants/${x.id}`} className="ee-row-title">
                            {x.name}
                          </Link>
                          <div className="ee-muted ee-mono" style={{ fontSize: 12 }}>
                            {x.primary_domain ?? x.schema_name}
                          </div>
                        </td>
                        <td className="ee-mono" style={{ textAlign: 'right' }}>
                          {x.total_users}
                        </td>
                        <td className="ee-mono" style={{ textAlign: 'right' }}>
                          {x.active_users_this_month}
                        </td>
                        <td>
                          <Tag variant={sub.variant}>{sub.label}</Tag>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </section>
        </div>

        <aside
          style={{
            flex: '1 1 300px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <section
            className="ee-panel"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h2 className="ee-heading">Obunasi tugayapti</h2>
            {expiring.length === 0 && expired.length === 0 ? (
              <span className="ee-muted" style={{ fontSize: 14 }}>
                Yaqin 30 kunda tugaydigan obuna yo'q.
              </span>
            ) : (
              [...expired, ...expiring].map((x) => {
                const sub = subscription(x)
                return (
                  <Link key={x.id} to={`/platform/tenants/${x.id}`} className="ee-row-link">
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 14 }}>{x.name}</strong>
                      <span className="ee-muted ee-mono" style={{ fontSize: 12 }}>
                        {formatDate(x.paid_until)} gacha
                      </span>
                    </span>
                    <Tag variant={sub.variant}>{sub.label}</Tag>
                  </Link>
                )
              })
            )}
          </section>

          <section
            className="ee-panel"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h2 className="ee-heading">Rollar</h2>
            {ROLE_ORDER.map((role) => {
              const item = u.roles_breakdown[role] as
                { count: number; percentage: number } | undefined
              if (!item) return null
              return (
                <div
                  key={role}
                  className="ee-bar-row"
                  // Tor ustun: nom qisqa, chiziqqa ko'proq joy
                  style={{ gridTemplateColumns: '104px minmax(0, 1fr) 32px' }}
                  title={`${STATUS_MAPS.role[role].label}: ${item.count} (${item.percentage}%)`}
                >
                  <span>{STATUS_MAPS.role[role].label}</span>
                  <span className="ee-bar-row__track" aria-hidden>
                    <span
                      className="ee-bar-row__fill"
                      style={{ width: `${Math.max(item.percentage, item.count ? 2 : 0)}%` }}
                    />
                  </span>
                  <span className="ee-mono" style={{ textAlign: 'right' }}>
                    {item.count}
                  </span>
                </div>
              )
            })}
          </section>
        </aside>
      </div>
    </Flex>
  )
}

/** Bitta qator ustunli diagramma: bitta seriya — legenda kerak emas, sarlavha nomlaydi */
function MonthlyBars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <>
      <div className="ee-colchart" role="img" aria-label="Oylar bo'yicha yangi foydalanuvchilar">
        {items.map((i) => (
          <Tooltip key={i.label} title={`${i.label}: ${i.value} ta yangi foydalanuvchi`}>
            <div className="ee-colchart__col" tabIndex={0}>
              <span className="ee-colchart__value ee-mono">{i.value || ''}</span>
              <span
                className="ee-colchart__bar"
                style={{ height: `${(i.value / max) * 100}%`, minHeight: i.value ? 4 : 0 }}
              />
              <span className="ee-colchart__label">
                {i.label.split(' ')[0]}
                {/* Telefonda yil yashiriladi — yorliqlar sig'ishi uchun */}
                <span className="ee-colchart__year"> {i.label.split(' ')[1]}</span>
              </span>
            </div>
          </Tooltip>
        ))}
      </div>
      {/* Ekran o'quvchilar uchun jadval ko'rinishi */}
      <table className="ee-visually-hidden">
        <caption>Oylar bo'yicha yangi foydalanuvchilar</caption>
        <tbody>
          {items.map((i) => (
            <tr key={i.label}>
              <th scope="row">{i.label}</th>
              <td>{i.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
