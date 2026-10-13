import { Alert, App, Button, Checkbox, DatePicker, Divider, Flex, Form, Input } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'

import type { ClientListRetrieve } from '@/shared/api/generated/model'
import { toApiDate } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { FormDrawer, PhoneInput, phoneRules } from '@/shared/ui'

import { useCreateTenant, useUpdateTenant } from '../api'

/** Backend RESERVED_SCHEMAS (apps/tenants/serializers.py) */
const RESERVED = new Set([
  'public',
  'schema',
  'tenant',
  'information_schema',
  'pg_catalog',
  'test',
  'admin',
  'auth',
  'media',
  'static',
])

/** Asosiy domen: platforma qaysi domenda ochilgan bo'lsa, markazlar uning subdomeni */
const BASE_DOMAIN = window.location.hostname.replace(/^www\./, '')

/** "Cambridge School" → "cambridge_school" */
const toSchema = (name: string) =>
  name
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+|_+$/g, '')
    .slice(0, 63)

interface CreateValues {
  name: string
  schema_name: string
  domain: string
  paid_until: Dayjs
  on_trial: boolean
  admin_username: string
  admin_password: string
  admin_phone: string
  admin_email?: string
}

export function CreateTenantDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const [form] = Form.useForm<CreateValues>()
  const create = useCreateTenant()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  // Foydalanuvchi o'zi o'zgartirmaguncha schema va domen nomdan avtomatik to'ladi
  const [touched, setTouched] = useState({ schema: false, domain: false })

  const initialValues = useMemo<Partial<CreateValues>>(
    () => ({ on_trial: true, paid_until: dayjs().add(14, 'day'), admin_username: 'admin' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- har ochilganda yangi sana
    [open],
  )

  const onNameChange = (name: string) => {
    const schema = toSchema(name)
    if (!touched.schema) form.setFieldValue('schema_name', schema)
    if (!touched.domain) {
      const current = touched.schema ? form.getFieldValue('schema_name') : schema
      form.setFieldValue('domain', current ? `${current.replace(/_/g, '-')}.${BASE_DOMAIN}` : '')
    }
  }

  const onSubmit = (v: CreateValues) =>
    create.mutate(
      {
        name: v.name.trim(),
        schema_name: v.schema_name,
        domain: v.domain.trim().toLowerCase(),
        paid_until: toApiDate(v.paid_until),
        on_trial: v.on_trial,
        admin_username: v.admin_username.trim(),
        admin_password: v.admin_password,
        admin_phone: v.admin_phone,
        admin_email: v.admin_email?.trim() ?? '',
      },
      {
        onSuccess: (t) => {
          message.success(
            `Markaz yaratildi — ${v.domain} da ${v.admin_username} bilan kirish mumkin`,
          )
          setTouched({ schema: false, domain: false })
          onClose()
          onCreated(t.id)
        },
        onError: (e) => handleError(e, form),
      },
    )

  return (
    <FormDrawer<CreateValues>
      open={open}
      title="Yangi o'quv markazi"
      form={form}
      initialValues={initialValues}
      onClose={() => {
        setTouched({ schema: false, domain: false })
        onClose()
      }}
      onSubmit={onSubmit}
      submitting={create.isPending}
      submitText="Markazni yaratish"
      width={520}
    >
      <Form.Item
        name="name"
        label="Markaz nomi"
        rules={[{ required: true, whitespace: true, message: 'Nomini kiriting' }, { max: 100 }]}
      >
        <Input
          maxLength={100}
          placeholder="Cambridge School"
          onChange={(e) => onNameChange(e.target.value)}
        />
      </Form.Item>
      <Form.Item
        name="schema_name"
        label="Texnik nom (schema)"
        extra="Yaratilgach o'zgartirib bo'lmaydi. Kichik lotin harflari, raqam va _"
        rules={[
          { required: true, message: 'Texnik nom kiriting' },
          { max: 63 },
          {
            pattern: /^[a-z][a-z0-9_]*$/,
            message: 'Kichik lotin harfi bilan boshlansin; faqat a–z, 0–9 va _',
          },
          {
            validator: (_, v?: string) =>
              v && (RESERVED.has(v) || v.startsWith('pg_'))
                ? Promise.reject(new Error(`«${v}» band — boshqa nom tanlang`))
                : Promise.resolve(),
          },
        ]}
      >
        <Input
          className="ee-mono"
          maxLength={63}
          onChange={() => setTouched((t) => ({ ...t, schema: true }))}
        />
      </Form.Item>
      <Form.Item
        name="domain"
        label="Domen"
        extra="Markaz shu manzilda ochiladi. DNS shu serverga yo'naltirilgan bo'lishi kerak"
        rules={[
          { required: true, message: 'Domen kiriting' },
          { pattern: /^[a-z0-9.-]+$/, message: 'Faqat kichik harflar, raqamlar, nuqta va -' },
        ]}
      >
        <Input
          className="ee-mono"
          maxLength={253}
          placeholder={`cambridge.${BASE_DOMAIN}`}
          onChange={() => setTouched((t) => ({ ...t, domain: true }))}
        />
      </Form.Item>
      <SubscriptionFields />

      <Divider titlePlacement="start" plain style={{ marginTop: 8 }}>
        Markaz egasi (birinchi kirish)
      </Divider>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Form.Item
          name="admin_username"
          label="Login"
          rules={[
            { required: true, message: 'Login kiriting' },
            { pattern: /^[\w.@+-]+$/, message: 'Lotin harflari, raqamlar, . _ - @' },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="admin_password"
          label="Parol"
          rules={[
            { required: true, message: 'Parol kiriting' },
            { min: 8, message: "Kamida 8 ta belgi bo'lsin" },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </div>
      <Form.Item name="admin_phone" label="Telefon" rules={phoneRules()}>
        <PhoneInput />
      </Form.Item>
      <Form.Item
        name="admin_email"
        label="Email"
        rules={[{ type: 'email', message: "Email noto'g'ri" }]}
      >
        <Input inputMode="email" autoComplete="off" />
      </Form.Item>
      {create.isPending && (
        <Alert
          type="info"
          showIcon
          title="Markaz yaratilmoqda…"
          description="Ma'lumotlar bazasi tayyorlanyapti — bu bir daqiqagacha cho'zilishi mumkin. Sahifani yopmang."
        />
      )}
    </FormDrawer>
  )
}

/** Obuna: tugash sanasi, sinov belgisi va tez uzaytirish tugmalari */
function SubscriptionFields() {
  const form = Form.useFormInstance()
  const extend = (months: number) => {
    const current: Dayjs | undefined = form.getFieldValue('paid_until')
    // Muddati o'tgan bo'lsa bugundan, aks holda joriy sanadan uzaytiramiz
    const from = current && current.isAfter(dayjs()) ? current : dayjs()
    form.setFieldValue('paid_until', from.add(months, 'month'))
  }
  return (
    <>
      <Form.Item
        name="paid_until"
        label="Obuna tugash sanasi"
        rules={[{ required: true, message: 'Sanani tanlang' }]}
        style={{ marginBottom: 8 }}
      >
        <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
      </Form.Item>
      <Flex gap={8} wrap style={{ marginBottom: 16 }}>
        {[1, 3, 6, 12].map((m) => (
          <Button key={m} size="small" onClick={() => extend(m)}>
            +{m} oy
          </Button>
        ))}
      </Flex>
      <Form.Item
        name="on_trial"
        valuePropName="checked"
        extra="Sinov muddatida markaz sana tugasa ham ishlayveradi"
      >
        <Checkbox>Sinov muddati</Checkbox>
      </Form.Item>
    </>
  )
}

interface EditValues {
  name: string
  paid_until: Dayjs
  on_trial: boolean
}

export function EditTenantDrawer({
  tenant,
  open,
  onClose,
}: {
  tenant: ClientListRetrieve | null
  open: boolean
  onClose: () => void
}) {
  const [form] = Form.useForm<EditValues>()
  const update = useUpdateTenant()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  const initialValues = useMemo<Partial<EditValues> | undefined>(
    () =>
      tenant
        ? { name: tenant.name, paid_until: dayjs(tenant.paid_until), on_trial: tenant.on_trial }
        : undefined,
    [tenant],
  )

  return (
    <FormDrawer<EditValues>
      open={open}
      title="Markazni tahrirlash"
      form={form}
      initialValues={initialValues}
      onClose={onClose}
      submitting={update.isPending}
      onSubmit={(v) =>
        tenant &&
        update.mutate(
          {
            id: tenant.id,
            data: {
              name: v.name.trim(),
              paid_until: toApiDate(v.paid_until),
              on_trial: v.on_trial,
            },
          },
          {
            onSuccess: () => {
              message.success('Saqlandi')
              onClose()
            },
            onError: (e) => handleError(e, form),
          },
        )
      }
    >
      <Form.Item
        name="name"
        label="Markaz nomi"
        rules={[{ required: true, whitespace: true, message: 'Nomini kiriting' }, { max: 100 }]}
      >
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item label="Texnik nom (schema)" extra="O'zgartirib bo'lmaydi">
        <Input className="ee-mono" value={tenant?.schema_name} disabled />
      </Form.Item>
      <SubscriptionFields />
    </FormDrawer>
  )
}
