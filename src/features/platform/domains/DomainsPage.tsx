import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Checkbox, Form, Input, Select, Space, Tooltip } from 'antd'
import { useMemo } from 'react'
import { Link } from 'react-router'

import type { Domain } from '@/shared/api/generated/model'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import {
  DataTable,
  DeleteButton,
  FormDrawer,
  PageHeader,
  Tag,
  useFormDrawer,
  type DataTableColumn,
} from '@/shared/ui'

import { useDeleteDomain, useDomains, useSaveDomain, useTenants } from '../api'

const isPublic = (d: Domain) => d.tenant_schema_name === 'public'

interface Values {
  domain: string
  tenant: number
  is_primary: boolean
}

export function DomainsPage() {
  const domains = useDomains()
  const tenants = useTenants()
  const save = useSaveDomain()
  const remove = useDeleteDomain()
  const drawer = useFormDrawer<Domain>()
  const [form] = Form.useForm<Values>()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  const [params, setParams] = useUrlState()

  const tenantId = Number(params.get('tenant')) || 0
  const search = (params.get('search') ?? '').toLowerCase()
  const rows = (domains.data ?? [])
    .filter(
      (d) =>
        (!tenantId || d.tenant === tenantId) &&
        (!search || `${d.domain} ${d.tenant_name}`.toLowerCase().includes(search)),
    )
    .sort(
      (a, b) =>
        a.tenant_name.localeCompare(b.tenant_name) || Number(b.is_primary) - Number(a.is_primary),
    )

  const initialValues = useMemo<Partial<Values>>(
    () =>
      drawer.record
        ? {
            domain: drawer.record.domain,
            tenant: drawer.record.tenant,
            is_primary: !!drawer.record.is_primary,
          }
        : { tenant: tenantId || undefined, is_primary: false },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat drawer ochilganda
    [drawer.record, drawer.open],
  )

  const onSubmit = (v: Values) =>
    save.mutate(
      {
        id: drawer.record?.id,
        data: { domain: v.domain.trim().toLowerCase(), tenant: v.tenant, is_primary: v.is_primary },
      },
      {
        onSuccess: () => {
          message.success(drawer.record ? 'Domen saqlandi' : "Domen qo'shildi")
          drawer.close()
        },
        onError: (e) => handleError(e, form),
      },
    )

  const columns: DataTableColumn<Domain>[] = [
    {
      title: 'Domen',
      dataIndex: 'domain',
      render: (v: string) => (
        <a
          href={`${window.location.protocol}//${v}${window.location.port ? `:${window.location.port}` : ''}`}
          target="_blank"
          rel="noreferrer"
          className="ee-mono"
          style={{ fontWeight: 700 }}
        >
          {v}
        </a>
      ),
    },
    {
      title: 'Markaz',
      key: 'tenant',
      render: (_, d) =>
        isPublic(d) ? (
          <span className="ee-muted">Platforma (asosiy)</span>
        ) : (
          <Link to={`/platform/tenants/${d.tenant}`}>{d.tenant_name}</Link>
        ),
    },
    {
      title: 'Turi',
      dataIndex: 'is_primary',
      render: (v?: boolean) =>
        v ? <Tag variant="pos">Asosiy</Tag> : <Tag variant="neu">Qo'shimcha</Tag>,
    },
    {
      key: 'actions',
      width: 96,
      fixed: 'right',
      render: (_, d) =>
        isPublic(d) ? (
          <Tooltip title="Platformaning asosiy domeni — o'zgartirib bo'lmaydi">
            <span className="ee-muted" style={{ fontSize: 12 }}>
              himoyalangan
            </span>
          </Tooltip>
        ) : (
          <Space size={0}>
            <Tooltip title="Tahrirlash">
              <Button
                type="text"
                icon={<EditOutlined />}
                aria-label="Tahrirlash"
                onClick={() => drawer.openEdit(d)}
              />
            </Tooltip>
            <DeleteButton
              title={`${d.domain} o'chirilsinmi?`}
              description={
                d.is_primary
                  ? "Bu markazning asosiy domeni — o'chirilsa markaz shu manzilda ochilmaydi."
                  : 'Markaz bu manzilda ochilmay qoladi.'
              }
              onConfirm={() =>
                remove
                  .mutateAsync(d.id)
                  .then(() => message.success("Domen o'chirildi"))
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
        eyebrow={`${domains.data?.length ?? 0} ta domen`}
        title="Domenlar"
        subtitle="Har bir markaz o'z domenida ochiladi. DNS yozuvi shu serverga yo'naltirilgan bo'lishi kerak"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={drawer.openCreate}
          >
            Domen qo'shish
          </Button>
        }
      />

      <DataTable<Domain>
        columns={columns}
        data={rows}
        loading={domains.isFetching}
        error={domains.error}
        onRetry={() => void domains.refetch()}
        searchPlaceholder="Domen yoki markaz"
        emptyText="Domen topilmadi"
        filters={
          <Select
            aria-label="Markaz"
            value={tenantId}
            onChange={(v) => setParams({ tenant: v || null })}
            style={{ width: 220 }}
            showSearch
            optionFilterProp="label"
            options={[
              { value: 0, label: 'Barcha markazlar' },
              ...(tenants.data ?? []).map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        }
      />

      <FormDrawer<Values>
        open={drawer.open}
        title={drawer.isEdit ? 'Domenni tahrirlash' : 'Yangi domen'}
        form={form}
        initialValues={initialValues}
        onClose={drawer.close}
        onSubmit={onSubmit}
        submitting={save.isPending}
        submitText={drawer.isEdit ? 'Saqlash' : "Qo'shish"}
      >
        <Form.Item
          name="tenant"
          label="Markaz"
          rules={[{ required: true, message: 'Markazni tanlang' }]}
        >
          <Select
            placeholder="Markazni tanlang"
            showSearch
            optionFilterProp="label"
            loading={tenants.isLoading}
            options={(tenants.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>
        <Form.Item
          name="domain"
          label="Domen"
          rules={[
            { required: true, message: 'Domen kiriting' },
            { max: 253 },
            { pattern: /^[a-z0-9.-]+$/, message: 'Faqat kichik harflar, raqamlar, nuqta va -' },
          ]}
        >
          <Input className="ee-mono" placeholder={`cambridge.${window.location.hostname}`} />
        </Form.Item>
        <Form.Item
          name="is_primary"
          valuePropName="checked"
          extra="Markazning avvalgi asosiy domeni qo'shimchaga aylanadi"
        >
          <Checkbox>Asosiy domen</Checkbox>
        </Form.Item>
      </FormDrawer>
    </>
  )
}
