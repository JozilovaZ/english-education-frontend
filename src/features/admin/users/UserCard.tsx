import {
  CalendarOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  UnlockOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons'
import { Button, Typography } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import type { Group, User } from '@/shared/api/generated/model'
import { formatDate, formatPhone } from '@/shared/lib/format'
import { STATUS_MAPS, Tag } from '@/shared/ui'

import { ParentBadge } from './ParentBadge'

/** Foydalanuvchi kartochkasi: qatorni bosganda ochiladi — aloqa, guruhlar, amallar */
export function UserCard({
  user: u,
  name,
  initials,
  groups,
  canManage,
  isSelf,
  onEdit,
  onToggleBlock,
}: {
  user: User
  name: string
  initials: string
  groups: Group[]
  canManage: boolean
  isSelf: boolean
  onEdit: () => void
  onToggleBlock: () => void
}) {
  const blocked = u.is_active === false
  const role = u.role ? STATUS_MAPS.role[u.role] : undefined

  return (
    <div className="ee-ucard">
      <div className="ee-ucard__head">
        <span className="ee-ucard__avatar">{initials}</span>
        <div style={{ minWidth: 0 }}>
          <div className="ee-ucard__name">{name}</div>
          <div className="ee-ucard__role">
            {role?.label}
            {blocked && ' · bloklangan'}
          </div>
        </div>
      </div>

      <dl className="ee-lcard__facts ee-ucard__facts">
        <Row icon={<UserOutlined />} label="Login">
          <Typography.Text copyable={{ text: u.username, tooltips: ['Nusxalash', 'Nusxalandi'] }}>
            @{u.username}
          </Typography.Text>
        </Row>
        <Row icon={<PhoneOutlined />} label="Telefon">
          <Typography.Text copyable={{ text: u.phone, tooltips: ['Nusxalash', 'Nusxalandi'] }}>
            <a href={`tel:${u.phone}`} style={{ color: 'inherit' }}>
              {formatPhone(u.phone)}
            </a>
          </Typography.Text>
        </Row>
        {u.email && (
          <Row icon={<MailOutlined />} label="Email">
            <a href={`mailto:${u.email}`} style={{ color: 'inherit', overflowWrap: 'anywhere' }}>
              {u.email}
            </a>
          </Row>
        )}
        {(u.role === 'STUDENT' || u.role === 'TEACHER') && (
          <Row icon={<TeamOutlined />} label={u.role === 'TEACHER' ? 'Dars beradi' : 'Guruhlar'}>
            {groups.length ? (
              <span
                style={{
                  display: 'inline-flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  justifyContent: 'flex-end',
                }}
              >
                {groups.map((g) => (
                  <Link key={g.id} to={`/admin/groups/${g.id}`}>
                    <Tag variant="prog">{g.name}</Tag>
                  </Link>
                ))}
              </span>
            ) : (
              <span className="ee-muted">Guruhga biriktirilmagan</span>
            )}
          </Row>
        )}
        {u.role === 'STUDENT' && (
          <Row icon={<UsergroupAddOutlined />} label="Ota-ona">
            <ParentBadge userId={u.id} />
          </Row>
        )}
        <Row icon={<CalendarOutlined />} label="Qo'shilgan">
          <span className="ee-num">{formatDate(u.date_joined)}</span>
        </Row>
      </dl>

      {canManage && (
        <div className="ee-lcard__actions" style={{ padding: '4px 0 0' }}>
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            Tahrirlash
          </Button>
          {!isSelf && (
            <Button
              icon={blocked ? <UnlockOutlined /> : <LockOutlined />}
              danger={!blocked}
              onClick={onToggleBlock}
            >
              {blocked ? 'Blokdan chiqarish' : 'Bloklash'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="ee-lcard__fact">
      <span className="ee-lcard__ficon" aria-hidden>
        {icon}
      </span>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
