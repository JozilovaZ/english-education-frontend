import {
  EditOutlined,
  LockOutlined,
  MoreOutlined,
  PlusOutlined,
  UnlockOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Dropdown,
  Flex,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAuthStore } from '@/features/auth/store'
import type { Role } from '@/features/auth/types'
import type { User } from '@/shared/api/generated/model'
import { formatDate, formatPhone } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import {
  DataTable,
  FormDrawer,
  PageHeader,
  PhoneInput,
  phoneRules,
  StatusTag,
  Tag,
  useFormDrawer,
  type DataTableColumn,
} from '@/shared/ui'

import {
  useDeleteUser,
  useGroups,
  useSaveUser,
  useStudentGroups,
  useUsers,
  type UserPayload,
} from '../api'
import { ParentBadge } from './ParentBadge'
import { UserCard } from './UserCard'

const ROLE_TABS = [
  { value: '', label: 'Hammasi' },
  { value: 'TEACHER', label: "O'qituvchilar" },
  { value: 'STUDENT', label: "O'quvchilar" },
  { value: 'ADMIN', label: 'Adminlar' },
]

/** Markaz egasi (SUPER_ADMIN) ham "Adminlar" tabida */
const roleTab = (role?: string) => (role === 'SUPER_ADMIN' ? 'ADMIN' : (role ?? ''))

const userName = (u: User) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/** Ism va familiyadan login: "Ali Valiyev" → "ali.valiyev" (faqat lotin harf va raqam) */
function makeLogin(first?: string, last?: string) {
  const part = (s?: string) =>
    (s ?? '')
      .toLowerCase()
      .replace(/[ʻʼ'`‘’]/g, '')
      .replace(/[^a-z0-9]/g, '')
  return [part(first), part(last)].filter(Boolean).join('.')
}

/** O'qish oson tasodifiy parol (o/0, l/1 kabi chalkash belgilarsiz), 8 belgi */
function makePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

interface Values {
  first_name: string
  last_name: string
  username: string
  phone: string
  email?: string
  role: Role
  password?: string
}

/**
 * Backend qoidalari (apps/users/permissions.py):
 * SUPER_ADMIN — hammani boshqaradi; ADMIN — faqat TEACHER va STUDENT. O'zini o'chirib bo'lmaydi.
 */
function canManage(me: { id: number; role: Role } | null, target: User) {
  if (!me) return false
  if (me.role === 'SUPER_ADMIN') return true
  return target.role === 'TEACHER' || target.role === 'STUDENT'
}

export function UsersPage() {
  const me = useAuthStore((s) => s.user)
  const users = useUsers()
  const save = useSaveUser()
  const remove = useDeleteUser()
  const drawer = useFormDrawer<User>({ openOnNew: true })
  const [form] = Form.useForm<Values>()
  const handleError = useApiErrorHandler()
  const { message, modal } = App.useApp()
  const [params, setParams] = useUrlState()
  const groups = useGroups()
  const studentGroups = useStudentGroups(groups.data)
  const [card, setCard] = useState<User | null>(null)
  // Login qo'lda o'zgartirilmagan bo'lsa — ismdan avtomatik tuziladi
  const [loginTouched, setLoginTouched] = useState(false)

  const groupsOf = (u: User) =>
    u.role === 'TEACHER'
      ? (groups.data ?? []).filter((g) => g.teacher === u.id)
      : (studentGroups.get(u.id) ?? [])

  const role = params.get('role') ?? ''
  const state = params.get('state') ?? ''
  const search = (params.get('search') ?? '').toLowerCase()

  // Backendda filtr va qidiruv yo'q — ro'yxat kichik, frontendda filtrlanadi
  const rows = useMemo(
    () =>
      (users.data ?? []).filter(
        (u) =>
          (!role || roleTab(u.role) === role) &&
          (!state || (state === 'blocked') === (u.is_active === false)) &&
          (!search ||
            [userName(u), u.username, u.phone, u.email]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(search))),
      ),
    [users.data, role, state, search],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { '': users.data?.length ?? 0 }
    for (const u of users.data ?? []) {
      const tab = roleTab(u.role)
      c[tab] = (c[tab] ?? 0) + 1
    }
    return c
  }, [users.data])

  const roleOptions = [
    ...(me?.role === 'SUPER_ADMIN' ? [{ value: 'ADMIN', label: 'Admin' }] : []),
    { value: 'TEACHER', label: "O'qituvchi" },
    { value: 'STUDENT', label: "O'quvchi" },
  ]

  const initialValues = useMemo<Partial<Values> | undefined>(() => {
    const u = drawer.record
    if (!u) return role === 'TEACHER' || role === 'STUDENT' ? { role } : { role: 'STUDENT' }
    return {
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      username: u.username,
      phone: u.phone,
      email: u.email ?? '',
      role: (u.role ?? 'STUDENT') as Role,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat drawer ochilganda
  }, [drawer.record, drawer.open])

  const onSubmit = (v: Values) => {
    const data: UserPayload = {
      first_name: v.first_name.trim(),
      last_name: v.last_name.trim(),
      phone: v.phone,
      email: v.email?.trim() ?? '',
      role: v.role,
      ...(drawer.record ? {} : { username: v.username.trim(), password: v.password }),
    }
    save.mutate(
      { id: drawer.record?.id, data },
      {
        onSuccess: () => {
          drawer.close()
          if (drawer.record) {
            message.success('Saqlandi')
            return
          }
          modal.success({
            title: `${[v.first_name, v.last_name].join(' ').trim()} qo'shildi`,
            content: (
              <Flex vertical gap={8} style={{ marginTop: 8 }}>
                <span className="ee-muted">
                  Kirish ma'lumotlarini foydalanuvchiga bering (parol keyin ko'rinmaydi):
                </span>
                <span>
                  Login:{' '}
                  <Typography.Text strong copyable>
                    {data.username}
                  </Typography.Text>
                </span>
                <span>
                  Parol:{' '}
                  <Typography.Text strong copyable>
                    {v.password}
                  </Typography.Text>
                </span>
                <span>
                  Manzil: <Typography.Text copyable>{window.location.origin}</Typography.Text>
                </span>
              </Flex>
            ),
            okText: 'Tayyor',
          })
        },
        onError: (e) => handleError(e, form),
      },
    )
  }

  const toggleBlock = (u: User) => {
    const blocking = u.is_active !== false
    modal.confirm({
      title: blocking ? `${userName(u)} bloklansinmi?` : `${userName(u)} blokdan chiqarilsinmi?`,
      content: blocking
        ? "Tizimga kira olmaydi. Ma'lumotlari (natijalar, davomat) saqlanib qoladi."
        : 'Yana tizimga kira oladi.',
      okText: blocking ? 'Bloklash' : 'Blokdan chiqarish',
      okButtonProps: { danger: blocking },
      cancelText: 'Bekor qilish',
      onOk: () =>
        save
          .mutateAsync({
            id: u.id,
            data: { is_active: !blocking } as UserPayload,
          })
          .then(() => message.success(blocking ? 'Bloklandi' : 'Blokdan chiqarildi'))
          .catch((e) => handleError(e)),
    })
  }

  const confirmDelete = (u: User) =>
    modal.confirm({
      title: `${userName(u)} o'chirilsinmi?`,
      content:
        "Bog'langan ma'lumotlar (guruh a'zoligi, natijalar, davomat) ham o'chib ketishi mumkin. Odatda bloklash yetarli.",
      okText: "O'chirish",
      okButtonProps: { danger: true },
      cancelText: 'Bekor qilish',
      onOk: () =>
        remove
          .mutateAsync(u.id)
          .then(() => message.success("O'chirildi"))
          .catch((e) => handleError(e)),
    })

  const columns: DataTableColumn<User>[] = [
    {
      title: 'Foydalanuvchi',
      key: 'name',
      render: (_, u) => (
        <Flex align="center" gap={10}>
          <span className="ee-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
            {initials(userName(u))}
          </span>
          <span>
            <strong style={{ display: 'block' }}>
              {userName(u)} {u.is_active === false && <Tag variant="neg">Bloklangan</Tag>}
            </strong>
            <span className="ee-muted ee-mono" style={{ fontSize: 12 }}>
              @{u.username}
            </span>
          </span>
        </Flex>
      ),
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      render: (v: string) => (
        <a href={`tel:${v}`} className="ee-num" style={{ color: 'inherit', whiteSpace: 'nowrap' }}>
          {formatPhone(v)}
        </a>
      ),
    },
    { title: 'Rol', dataIndex: 'role', render: (v: string) => <StatusTag kind="role" value={v} /> },
    {
      title: 'Guruhlar',
      key: 'groups',
      render: (_, u) => {
        if (u.role !== 'STUDENT' && u.role !== 'TEACHER') return null
        const list = groupsOf(u)
        return list.length ? (
          <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
            {list.map((g) => (
              <Link key={g.id} to={`/admin/groups/${g.id}`}>
                <Tag variant="prog">{g.name}</Tag>
              </Link>
            ))}
          </span>
        ) : (
          <span className="ee-muted" style={{ fontSize: 12 }}>
            Guruhsiz
          </span>
        )
      },
    },
    ...(role === '' || role === 'STUDENT'
      ? [
          {
            title: 'Ota-ona',
            key: 'parent',
            // Har bir talaba uchun alohida so'rov — faqat ko'rinib turgan sahifadagi qatorlar uchun
            render: (_: unknown, u: User) =>
              u.role === 'STUDENT' ? <ParentBadge userId={u.id} /> : null,
          },
        ]
      : []),
    {
      title: "Qo'shilgan",
      dataIndex: 'date_joined',
      render: (v: string) => <span className="ee-mono">{formatDate(v)}</span>,
    },
    {
      key: 'actions',
      width: 56,
      fixed: 'right',
      render: (_, u) => {
        if (!canManage(me, u)) return null
        const self = u.id === me?.id
        return (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash' },
                ...(self
                  ? []
                  : [
                      u.is_active === false
                        ? { key: 'block', icon: <UnlockOutlined />, label: 'Blokdan chiqarish' }
                        : { key: 'block', icon: <LockOutlined />, label: 'Bloklash' },
                      { type: 'divider' as const },
                      {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: "O'chirish",
                        danger: true,
                      },
                    ]),
              ],
              onClick: ({ key }) => {
                if (key === 'edit') drawer.openEdit(u)
                if (key === 'block') toggleBlock(u)
                if (key === 'delete') confirmDelete(u)
              },
            }}
          >
            <Button type="text" icon={<MoreOutlined />} aria-label="Harakatlar" />
          </Dropdown>
        )
      },
    },
  ]

  const editingSelf = drawer.record?.id === me?.id

  return (
    <>
      <PageHeader
        eyebrow={`${counts['']} ta foydalanuvchi`}
        title="Foydalanuvchilar"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={drawer.openCreate}
          >
            Foydalanuvchi qo'shish
          </Button>
        }
      />

      <Segmented
        style={{ marginBottom: 16 }}
        value={role}
        onChange={(v) => setParams({ role: v || null })}
        options={ROLE_TABS.map((t) => ({
          value: t.value,
          label: `${t.label} · ${counts[t.value] ?? 0}`,
        }))}
      />

      <DataTable<User>
        columns={columns}
        data={rows}
        loading={users.isFetching}
        error={users.error}
        onRetry={() => void users.refetch()}
        searchPlaceholder="Ism, login yoki telefon"
        emptyText="Foydalanuvchi topilmadi"
        onRow={(u) => ({
          onClick: (e) => {
            // Havola, tugma yoki menyu bosilganda kartochka ochilmaydi
            if ((e.target as HTMLElement).closest('a, button, .ant-dropdown, .ant-typography-copy'))
              return
            setCard(u)
          },
          style: { cursor: 'pointer' },
        })}
        filters={
          <Select
            aria-label="Holati"
            value={state}
            onChange={(v) => setParams({ state: v || null })}
            style={{ width: 160 }}
            options={[
              { value: '', label: 'Barcha holatlar' },
              { value: 'active', label: 'Faol' },
              { value: 'blocked', label: 'Bloklangan' },
            ]}
          />
        }
      />

      <Modal
        open={card !== null}
        onCancel={() => setCard(null)}
        footer={null}
        width={440}
        centered
        destroyOnHidden
      >
        {card && (
          <UserCard
            user={card}
            name={userName(card)}
            initials={initials(userName(card))}
            groups={groupsOf(card)}
            canManage={canManage(me, card)}
            isSelf={card.id === me?.id}
            onEdit={() => {
              setCard(null)
              drawer.openEdit(card)
            }}
            onToggleBlock={() => {
              setCard(null)
              toggleBlock(card)
            }}
          />
        )}
      </Modal>

      <FormDrawer<Values>
        open={drawer.open}
        title={drawer.isEdit ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}
        form={form}
        initialValues={initialValues}
        onClose={() => {
          setLoginTouched(false)
          drawer.close()
        }}
        onSubmit={onSubmit}
        submitting={save.isPending}
        submitText={drawer.isEdit ? 'Saqlash' : "Qo'shish"}
        onValuesChange={(changed, all) => {
          if (drawer.isEdit) return
          if ('username' in changed) setLoginTouched(true)
          else if (!loginTouched && ('first_name' in changed || 'last_name' in changed))
            form.setFieldValue('username', makeLogin(all.first_name, all.last_name))
        }}
      >
        <Form.Item name="role" label="Rol" rules={[{ required: true, message: 'Rolni tanlang' }]}>
          <Segmented block options={roleOptions} disabled={editingSelf} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <Form.Item
            name="first_name"
            label="Ism"
            rules={[{ required: true, whitespace: true, message: 'Ismni kiriting' }, { max: 150 }]}
          >
            <Input maxLength={150} autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="last_name"
            label="Familiya"
            rules={[
              { required: true, whitespace: true, message: 'Familiyani kiriting' },
              { max: 150 },
            ]}
          >
            <Input maxLength={150} autoComplete="off" />
          </Form.Item>
        </div>
        <Form.Item name="phone" label="Telefon" rules={phoneRules()}>
          <PhoneInput />
        </Form.Item>
        <Form.Item
          name="username"
          label="Login"
          extra={
            drawer.isEdit
              ? "Loginni o'zgartirib bo'lmaydi"
              : "Ism va familiyadan avtomatik tuziladi — xohlasangiz o'zgartiring"
          }
          rules={[
            { required: true, message: 'Login kiriting' },
            { max: 150 },
            {
              pattern: /^[\w.@+-]+$/,
              message: "Faqat lotin harflari, raqamlar va . _ - @ + bo'lsin",
            },
          ]}
        >
          <Input disabled={drawer.isEdit} autoComplete="off" />
        </Form.Item>
        {!drawer.isEdit && (
          <Form.Item
            name="password"
            label="Parol"
            extra="Qo'shilgandan keyin login va parol ko'rsatiladi — nusxalab foydalanuvchiga bering"
            rules={[
              { required: true, message: 'Parol kiriting' },
              { min: 8, message: "Kamida 8 ta belgi bo'lsin" },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              addonAfter={
                <Button
                  type="text"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  onClick={() => form.setFieldValue('password', makePassword())}
                >
                  Yaratish
                </Button>
              }
            />
          </Form.Item>
        )}
        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: 'email', message: "Email noto'g'ri" }]}
        >
          <Input inputMode="email" autoComplete="off" />
        </Form.Item>
      </FormDrawer>
    </>
  )
}
