import { PlusOutlined } from '@ant-design/icons'
import { Button, Segmented } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { ClientListRetrieve } from '@/shared/api/generated/model'
import { formatDate } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { DataTable, PageHeader, Tag, type DataTableColumn } from '@/shared/ui'

import { useTenants } from '../api'
import { isExpiring, subscription } from '../tenantMeta'
import { CreateTenantDrawer } from './TenantDrawers'

const FILTERS: { value: string; label: string; test: (t: ClientListRetrieve) => boolean }[] = [
  { value: '', label: 'Hammasi', test: () => true },
  { value: 'paid', label: "To'langan", test: (t) => !t.on_trial && t.is_active },
  { value: 'trial', label: 'Sinovda', test: (t) => t.on_trial },
  { value: 'expiring', label: 'Tez tugaydi', test: isExpiring },
  { value: 'expired', label: 'Tugagan', test: (t) => !t.is_active },
]

export function TenantsPage() {
  const tenants = useTenants()
  const navigate = useNavigate()
  const [params, setParams] = useUrlState()
  const [creating, setCreating] = useState(false)

  const filter = FILTERS.find((f) => f.value === (params.get('status') ?? '')) ?? FILTERS[0]
  const search = (params.get('search') ?? '').toLowerCase()
  const all = tenants.data ?? []
  const rows = all.filter(
    (t) =>
      filter.test(t) &&
      (!search ||
        [t.name, t.schema_name, ...t.domains.map((d) => d.domain)].some((v) =>
          v.toLowerCase().includes(search),
        )),
  )

  const columns: DataTableColumn<ClientListRetrieve>[] = [
    {
      title: 'Markaz',
      key: 'name',
      render: (_, t) => (
        <>
          <Link to={`/platform/tenants/${t.id}`} className="ee-row-title">
            {t.name}
          </Link>
          <div className="ee-muted ee-mono" style={{ fontSize: 12 }}>
            {t.primary_domain ?? "domen yo'q"}
          </div>
        </>
      ),
    },
    {
      title: 'Schema',
      dataIndex: 'schema_name',
      render: (v: string) => <span className="ee-mono">{v}</span>,
    },
    {
      title: 'Foydalanuvchilar',
      dataIndex: 'users_count',
      align: 'right',
      render: (v: number, t) => (
        <span
          className="ee-mono"
          title={`O'qituvchi: ${t.users_by_role?.TEACHER ?? 0}, o'quvchi: ${t.users_by_role?.STUDENT ?? 0}`}
        >
          {v}
        </span>
      ),
    },
    {
      title: 'Obuna',
      key: 'subscription',
      render: (_, t) => {
        const sub = subscription(t)
        return (
          <>
            <Tag variant={sub.variant}>{sub.label}</Tag>
            <div className="ee-muted ee-mono" style={{ fontSize: 12, marginTop: 4 }}>
              {formatDate(t.paid_until)} gacha
            </div>
          </>
        )
      },
    },
    {
      title: 'Yaratilgan',
      dataIndex: 'created_on',
      render: (v: string) => <span className="ee-mono">{formatDate(v)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={`${all.length} ta markaz`}
        title="O'quv markazlari"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={() => setCreating(true)}
          >
            Markaz qo'shish
          </Button>
        }
      />

      <Segmented
        style={{ marginBottom: 16 }}
        value={filter.value}
        onChange={(v) => setParams({ status: v || null })}
        options={FILTERS.map((f) => ({
          value: f.value,
          label: `${f.label} · ${all.filter(f.test).length}`,
        }))}
      />

      <DataTable<ClientListRetrieve>
        columns={columns}
        data={rows}
        loading={tenants.isFetching}
        error={tenants.error}
        onRetry={() => void tenants.refetch()}
        searchPlaceholder="Nomi, schema yoki domen"
        emptyText="Markaz topilmadi"
        onRow={(t) => ({
          onClick: (e) => {
            if ((e.target as HTMLElement).closest('a, button')) return
            navigate(`/platform/tenants/${t.id}`)
          },
          style: { cursor: 'pointer' },
        })}
      />

      <CreateTenantDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => navigate(`/platform/tenants/${id}`)}
      />
    </>
  )
}
