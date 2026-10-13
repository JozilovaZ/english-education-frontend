import { DeleteOutlined, EditOutlined, UserAddOutlined } from '@ant-design/icons'
import { App, Button, Empty, Flex, Form, Input, Modal, Segmented, Skeleton } from 'antd'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { formatDate, formatDateTime, formatPhone } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import {
  FormDrawer,
  PageHeader,
  PhoneInput,
  phoneRules,
  QueryError,
  StatRow,
  StatTile,
  StatusTag,
  Tag,
} from '@/shared/ui'
import { Facts } from '@/shared/ui/exam'

import {
  useCreateTenantAdmin,
  useDeleteTenant,
  useTenant,
  useTenantStats,
  useTenantUsers,
  type TenantAdminPayload,
} from '../api'
import { subscription } from '../tenantMeta'
import { EditTenantDrawer } from './TenantDrawers'

/** Markaz domenidagi sayt manzili (dev'da port ham qo'shiladi) */
const siteUrl = (domain: string) =>
  `${window.location.protocol}//${domain}${window.location.port ? `:${window.location.port}` : ''}`

export function TenantDetailPage() {
  const id = Number(useParams().id)
  const tenant = useTenant(id)
  const stats = useTenantStats(id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingAdmin, setAddingAdmin] = useState(false)

  if (tenant.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (tenant.isError) return <QueryError error={tenant.error} onRetry={() => tenant.refetch()} />

  const t = tenant.data
  const sub = subscription(t)
  const s = stats.data

  return (
    <>
      <PageHeader
        eyebrow={t.primary_domain ?? t.schema_name}
        title={t.name}
        backTo="/platform/tenants"
        extra={
          <>
            <Tag variant={sub.variant}>{sub.label}</Tag>
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Tahrirlash
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setDeleting(true)}>
              O'chirish
            </Button>
          </>
        }
      />

      <div className="ee-panel" style={{ marginBottom: 24 }}>
        <Facts
          items={[
            { label: 'Schema', value: t.schema_name },
            { label: 'Yaratilgan', value: formatDate(t.created_on) },
            { label: 'Obuna tugashi', value: formatDate(t.paid_until) },
          ]}
        />
        <Flex gap={8} wrap align="center" style={{ marginTop: 16 }}>
          <span className="ee-eyebrow">Domenlar:</span>
          {t.domains.length === 0 ? (
            <span className="ee-muted">yo'q</span>
          ) : (
            t.domains.map((d) => (
              <a
                key={d.id}
                href={siteUrl(d.domain)}
                target="_blank"
                rel="noreferrer"
                className={`ee-tag ee-mono ee-tag--${d.is_primary ? 'pos' : 'neu'}`}
                title="Saytni ochish"
              >
                {d.domain}
              </a>
            ))
          )}
          <Link to={`/platform/domains?tenant=${t.id}`} style={{ fontSize: 14, fontWeight: 700 }}>
            Boshqarish
          </Link>
        </Flex>
      </div>

      <div style={{ marginBottom: 32 }}>
        <StatRow min={150}>
          <StatTile
            label="Foydalanuvchilar"
            value={s ? s.users.total : '…'}
            suffix={s ? `${s.users.active} faol` : undefined}
            tone="accent"
          />
          <StatTile label="Bu oy faol" value={s ? s.users.active_logged_in_this_month : '…'} />
          <StatTile label="Kurslar" value={s ? s.education_metrics.courses : '…'} />
          <StatTile label="Guruhlar" value={s ? s.education_metrics.groups : '…'} />
          <StatTile label="Imtihonlar" value={s ? s.education_metrics.exams : '…'} />
          <StatTile label="Uy vazifalari" value={s ? s.education_metrics.homeworks : '…'} />
        </StatRow>
      </div>

      <Flex justify="space-between" align="center" gap={12} wrap style={{ marginBottom: 16 }}>
        <h2 className="ee-heading">Foydalanuvchilar</h2>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAddingAdmin(true)}>
          Admin qo'shish
        </Button>
      </Flex>
      <UsersTable tenantId={id} />

      <EditTenantDrawer tenant={t} open={editing} onClose={() => setEditing(false)} />
      <AddAdminDrawer tenantId={id} open={addingAdmin} onClose={() => setAddingAdmin(false)} />
      <DeleteTenantModal
        open={deleting}
        tenantId={t.id}
        name={t.name}
        schema={t.schema_name}
        onClose={() => setDeleting(false)}
      />
    </>
  )
}

function UsersTable({ tenantId }: { tenantId: number }) {
  const users = useTenantUsers(tenantId)
  const [role, setRole] = useState('')

  if (users.isPending) return <Skeleton active paragraph={{ rows: 5 }} />
  if (users.isError) return <QueryError error={users.error} onRetry={() => users.refetch()} />
  if (users.data.length === 0)
    return (
      <div className="ee-panel">
        <Empty description="Markazda hali foydalanuvchi yo'q — admin qo'shing" />
      </div>
    )

  // Platforma egasiga eng kerakli: adminlar tepada
  const order = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT']
  const list = users.data
    .filter((u) => !role || u.role === role || (role === 'ADMIN' && u.role === 'SUPER_ADMIN'))
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))

  return (
    <Flex vertical gap={12}>
      <Segmented
        value={role}
        onChange={setRole}
        options={[
          { value: '', label: `Hammasi · ${users.data.length}` },
          { value: 'ADMIN', label: 'Adminlar' },
          { value: 'TEACHER', label: "O'qituvchilar" },
          { value: 'STUDENT', label: "O'quvchilar" },
        ]}
      />
      <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="ee-table ee-table--compact">
          <thead>
            <tr>
              <th>Foydalanuvchi</th>
              <th>Telefon</th>
              <th>Rol</th>
              <th>Oxirgi kirish</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td style={{ minWidth: 180 }}>
                  <strong>
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                  </strong>
                  <div className="ee-muted ee-mono" style={{ fontSize: 12 }}>
                    @{u.username}
                    {!u.is_active && ' · bloklangan'}
                  </div>
                </td>
                <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                  {formatPhone(u.phone)}
                </td>
                <td>
                  <StatusTag kind="role" value={u.role} />
                </td>
                <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                  {u.last_login ? formatDateTime(u.last_login) : 'hech qachon'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Flex>
  )
}

function AddAdminDrawer({
  tenantId,
  open,
  onClose,
}: {
  tenantId: number
  open: boolean
  onClose: () => void
}) {
  const [form] = Form.useForm<TenantAdminPayload>()
  const create = useCreateTenantAdmin(tenantId)
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  return (
    <FormDrawer<TenantAdminPayload>
      open={open}
      title="Markazga admin qo'shish"
      form={form}
      initialValues={{ role: 'ADMIN' }}
      onClose={onClose}
      submitting={create.isPending}
      submitText="Qo'shish"
      onSubmit={(v) =>
        create.mutate(
          { ...v, username: v.username.trim(), email: v.email?.trim() ?? '' },
          {
            onSuccess: () => {
              message.success("Admin qo'shildi")
              onClose()
            },
            onError: (e) => handleError(e, form),
          },
        )
      }
    >
      <Form.Item name="role" label="Rol">
        <Segmented
          block
          options={[
            { value: 'ADMIN', label: 'Admin' },
            { value: 'SUPER_ADMIN', label: 'Markaz egasi' },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="username"
        label="Login"
        rules={[
          { required: true, message: 'Login kiriting' },
          { pattern: /^[\w.@+-]+$/, message: 'Lotin harflari, raqamlar, . _ - @' },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="password"
        label="Parol"
        rules={[
          { required: true, message: 'Parol kiriting' },
          { min: 8, message: "Kamida 8 ta belgi bo'lsin" },
        ]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="phone" label="Telefon" rules={phoneRules()}>
        <PhoneInput />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ type: 'email', message: "Email noto'g'ri" }]}>
        <Input inputMode="email" autoComplete="off" />
      </Form.Item>
    </FormDrawer>
  )
}

/** Qaytarib bo'lmaydigan amal — tasdiqlash uchun schema nomini yozish kerak */
function DeleteTenantModal({
  open,
  tenantId,
  name,
  schema,
  onClose,
}: {
  open: boolean
  tenantId: number
  name: string
  schema: string
  onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  const remove = useDeleteTenant()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  const navigate = useNavigate()

  return (
    <Modal
      open={open}
      title={`«${name}» markazini o'chirish`}
      okText="O'chirish"
      okButtonProps={{ danger: true, disabled: typed !== schema, loading: remove.isPending }}
      cancelText="Bekor qilish"
      onCancel={() => {
        setTyped('')
        onClose()
      }}
      onOk={() =>
        remove.mutate(tenantId, {
          onSuccess: () => {
            message.success("Markaz o'chirildi")
            navigate('/platform/tenants', { replace: true })
          },
          onError: (e) => handleError(e),
        })
      }
      destroyOnHidden
    >
      <p>
        Markaz va uning domenlari platformadan olib tashlanadi — uning foydalanuvchilari tizimga
        kira olmaydi. Ma'lumotlar bazasidagi <span className="ee-mono">{schema}</span> schema
        o'chirilmaydi (keyin qo'lda tiklash mumkin).
      </p>
      <p style={{ marginBottom: 8 }}>
        Tasdiqlash uchun <strong className="ee-mono">{schema}</strong> deb yozing:
      </p>
      <Input
        className="ee-mono"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        aria-label="Schema nomi"
        autoComplete="off"
      />
    </Modal>
  )
}
