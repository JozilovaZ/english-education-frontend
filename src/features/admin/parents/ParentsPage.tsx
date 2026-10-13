import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Form, Input, Select, Space, Tooltip } from 'antd'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { ParentSerializers, User } from '@/shared/api/generated/model'
import { formatPhone } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import {
  DataTable,
  DeleteButton,
  FormDrawer,
  PageHeader,
  PhoneInput,
  phoneRules,
  Tag,
  useFormDrawer,
  type DataTableColumn,
} from '@/shared/ui'

import {
  useDeleteParent,
  useGroups,
  useParents,
  useSaveParent,
  useStudentGroups,
  useUsers,
} from '../api'
import { ParentBadge } from '../users/ParentBadge'

/** Ota-onalar ulanadigan bot havolasi (.env: VITE_TELEGRAM_BOT_URL) */
const BOT_URL = import.meta.env.VITE_TELEGRAM_BOT_URL as string | undefined

const userName = (u?: User) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username : '—'

/** "+998901234567" ↔ "+998 90 123 45 67": backend ikkala ko'rinishda qaytarishi mumkin */
const digits = (phone?: string) => (phone ?? '').replace(/\D/g, '').slice(-9)

const initials = (name: string) =>
  name
    .split(' ')
    // "(ota-ona)" kabi qavsli so'zlar hisobga olinmaydi
    .filter((w) => /^\p{L}/u.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

interface Values {
  full_name: string
  phone: string
  user: number
}

export function ParentsPage() {
  const parents = useParents()
  const users = useUsers()
  const save = useSaveParent()
  const remove = useDeleteParent()
  const drawer = useFormDrawer<ParentSerializers>({ openOnNew: true })
  const [form] = Form.useForm<Values>()
  const handleError = useApiErrorHandler()
  const { message, modal } = App.useApp()
  const [params] = useUrlState()
  const search = (params.get('search') ?? '').toLowerCase()
  const groups = useGroups()
  const studentGroups = useStudentGroups(groups.data)
  // Ogohlantirishdagi talaba bosilsa — forma shu talaba tanlangan holda ochiladi
  const [preset, setPreset] = useState<number | undefined>()

  const openCreate = (studentId?: number) => {
    setPreset(studentId)
    drawer.openCreate()
  }

  const userById = useMemo(() => new Map((users.data ?? []).map((u) => [u.id, u])), [users.data])
  const students = (users.data ?? []).filter((u) => u.role === 'STUDENT')

  const rows = (parents.data ?? []).filter(
    (p) =>
      !search ||
      [p.full_name, p.phone, userName(userById.get(p.user))].some((v) =>
        v.toLowerCase().includes(search),
      ),
  )
  const withoutParent = students.filter(
    (s) => s.is_active !== false && !(parents.data ?? []).some((p) => p.user === s.id),
  )

  const initialValues = useMemo<Partial<Values> | undefined>(
    () =>
      drawer.record
        ? {
            full_name: drawer.record.full_name,
            phone: drawer.record.phone,
            user: drawer.record.user,
          }
        : { user: preset },
    [drawer.record, preset],
  )

  /** Talabaning nechta ota-onasi bor (bir talabaga bir nechta ota-ona biriktirish mumkin) */
  const parentCount = (studentId: number) =>
    (parents.data ?? []).filter((p) => p.user === studentId).length

  const submit = (v: Values) =>
    save.mutate(
      {
        id: drawer.record?.id,
        data: { full_name: v.full_name.trim(), phone: v.phone, user: v.user },
      },
      {
        onSuccess: () => {
          message.success(drawer.record ? 'Saqlandi' : "Ota-ona qo'shildi")
          drawer.close()
        },
        onError: (e) => handleError(e, form),
      },
    )

  const onSubmit = (v: Values) => {
    // Backend raqam o'zgarsa Telegram ulanishini o'chiradi
    if (drawer.record && digits(drawer.record.phone) !== digits(v.phone)) {
      modal.confirm({
        title: "Telefon raqami o'zgaryapti",
        content:
          "Ota-ona Telegram botga qaytadan ulanishi kerak bo'ladi: botda /start bosib, yangi raqamini yuboradi. Ungacha xabarlar bormaydi.",
        okText: 'Saqlash',
        cancelText: 'Ortga',
        onOk: () => submit(v),
      })
      return
    }
    submit(v)
  }

  const columns: DataTableColumn<ParentSerializers>[] = [
    {
      title: 'Ota-ona',
      dataIndex: 'full_name',
      render: (v: string) => (
        <Flex align="center" gap={10}>
          <span className="ee-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
            {initials(v)}
          </span>
          <strong>{v}</strong>
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
    {
      title: 'Farzandi',
      dataIndex: 'user',
      render: (id: number) => {
        const list = studentGroups.get(id) ?? []
        return (
          <span>
            <span style={{ display: 'block' }}>{userName(userById.get(id))}</span>
            {list.length > 0 ? (
              <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
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
            )}
          </span>
        )
      },
    },
    {
      title: 'Telegram bot',
      key: 'bot',
      render: (_, p) => <ParentBadge userId={p.user} />,
    },
    {
      key: 'actions',
      width: 96,
      fixed: 'right',
      render: (_, p) => (
        <Space size={0}>
          <Tooltip title="Tahrirlash">
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Tahrirlash"
              onClick={() => drawer.openEdit(p)}
            />
          </Tooltip>
          <DeleteButton
            title={`${p.full_name} o'chirilsinmi?`}
            description="Unga boshqa Telegram xabar bormaydi."
            onConfirm={() =>
              remove
                .mutateAsync(p.id)
                .then(() => message.success("O'chirildi"))
                .catch((e) => handleError(e))
            }
          />
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={`${parents.data?.length ?? 0} ta ota-ona`}
        title="Ota-onalar"
        subtitle="Davomat, uy vazifasi va imtihon natijalari ota-onaga Telegram orqali boradi"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={() => openCreate()}
          >
            Ota-ona qo'shish
          </Button>
        }
      />

      {withoutParent.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${withoutParent.length} ta talabaga ota-ona biriktirilmagan`}
          description={
            <Flex vertical gap={8}>
              <span className="ee-muted">Talabani bosing — ota-onasini darhol qo'shasiz</span>
              <Flex wrap gap={6}>
                {withoutParent.map((s) => (
                  <Button
                    key={s.id}
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => openCreate(s.id)}
                  >
                    {userName(s)}
                  </Button>
                ))}
              </Flex>
            </Flex>
          }
        />
      )}

      <DataTable<ParentSerializers>
        columns={columns}
        data={rows}
        loading={parents.isFetching}
        error={parents.error}
        onRetry={() => void parents.refetch()}
        searchPlaceholder="Ism, telefon yoki farzandi"
        emptyText="Ota-ona topilmadi"
        onRow={(p) => ({
          onClick: (e) => {
            // Havola yoki tugma bosilganda tahrirlash oynasi ochilmaydi
            if ((e.target as HTMLElement).closest('a, button')) return
            drawer.openEdit(p)
          },
          style: { cursor: 'pointer' },
        })}
      />

      <FormDrawer<Values>
        open={drawer.open}
        title={drawer.isEdit ? 'Ota-onani tahrirlash' : 'Yangi ota-ona'}
        form={form}
        initialValues={initialValues}
        onClose={drawer.close}
        onSubmit={onSubmit}
        submitting={save.isPending}
        submitText={drawer.isEdit ? 'Saqlash' : "Qo'shish"}
      >
        <Form.Item
          name="user"
          label="Farzandi"
          rules={[{ required: true, message: 'Talabani tanlang' }]}
        >
          <Select
            placeholder="Talabani tanlang"
            showSearch
            optionFilterProp="label"
            loading={users.isLoading}
            // Ota-onasi yo'q talabalar ro'yxat boshida
            options={[...students]
              .sort((a, b) => Number(parentCount(a.id) > 0) - Number(parentCount(b.id) > 0))
              .map((s) => ({
                value: s.id,
                label: `${userName(s)} · ${formatPhone(s.phone)}`,
                count: parentCount(s.id),
              }))}
            optionRender={(o) => (
              <Flex justify="space-between" gap={8}>
                <span>{o.label}</span>
                {o.data.count > 0 && (
                  <span className="ee-muted" style={{ fontSize: 12 }}>
                    {o.data.count} ta ota-onasi bor
                  </span>
                )}
              </Flex>
            )}
          />
        </Form.Item>
        <Form.Item
          name="full_name"
          label="F.I.Sh."
          rules={[{ required: true, whitespace: true, message: 'Ismini kiriting' }]}
        >
          <Input placeholder="Karimova Malika" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Telefon"
          extra="Shu raqam Telegram'dagi raqami bilan bir xil bo'lishi kerak"
          rules={phoneRules()}
        >
          <PhoneInput />
        </Form.Item>
        <Alert
          type="info"
          showIcon
          title="Botga ulanish"
          description={
            <>
              Ota-ona Telegram botni ochib <strong>/start</strong> bosadi va kontaktini yuboradi.
              {BOT_URL && (
                <>
                  {' '}
                  Bot:{' '}
                  <a href={BOT_URL} target="_blank" rel="noreferrer">
                    {BOT_URL.replace(/^https?:\/\//, '')}
                  </a>
                </>
              )}
            </>
          }
        />
      </FormDrawer>
    </>
  )
}
