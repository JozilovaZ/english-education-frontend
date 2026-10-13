import { PlusOutlined, FilterOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Pagination,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
} from 'antd'
import { useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import { BrandMark } from '@/app/layouts/BrandMark'
import { ThemeToggle } from '@/app/layouts/ThemeToggle'
import { BASE, getPalette, type Palette } from '@/app/palette'
import { useResolvedThemeMode, useThemeModeStore } from '@/app/themeMode'
import {
  DataTable,
  FileUpload,
  PageHeader,
  PhoneInput,
  QueryError,
  STATUS_MAPS,
  StatusTag,
  Tag,
  statusOptions,
  type DataTableColumn,
  type StatusKind,
} from '@/shared/ui'

const SECTION_GAP = 24

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card title={title} extra={hint && <Typography.Text type="secondary">{hint}</Typography.Text>}>
      {children}
    </Card>
  )
}

function Swatch({ name, value, note }: { name: string; value: string; note?: string }) {
  return (
    <Flex vertical gap={6} style={{ minWidth: 0 }}>
      <div
        style={{
          height: 56,
          borderRadius: 10,
          background: value,
          border: '1px solid var(--ee-border)',
        }}
      />
      <Typography.Text strong style={{ fontSize: 13 }}>
        {name}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }} className="ee-num">
        {value}
        {note ? ` · ${note}` : ''}
      </Typography.Text>
    </Flex>
  )
}

const DERIVED: { key: keyof Palette; name: string }[] = [
  { key: 'bg', name: 'Sahifa foni' },
  { key: 'surface', name: 'Kartochka' },
  { key: 'surfaceMuted', name: 'Sarlavha / hover' },
  { key: 'border', name: 'Chegara' },
  { key: 'text2', name: 'Ikkinchi matn' },
  { key: 'borderStrong', name: 'Input chegarasi' },
  { key: 'accentSoft', name: 'Amber och' },
  { key: 'inkSoft', name: 'Slate och' },
]

interface GroupRow {
  id: number
  name: string
  teacher: string
  status: string
  students: number
  capacity: number
  price: number
}

const ROWS: GroupRow[] = [
  {
    id: 1,
    name: 'GE-1',
    teacher: 'Dilnoza Karimova',
    status: 'active',
    students: 12,
    capacity: 15,
    price: 450000,
  },
  {
    id: 2,
    name: 'IELTS-2',
    teacher: 'Sardor Aliyev',
    status: 'recruiting',
    students: 6,
    capacity: 12,
    price: 750000,
  },
  {
    id: 3,
    name: 'Kids-A',
    teacher: 'Malika Yusupova',
    status: 'paused',
    students: 9,
    capacity: 10,
    price: 380000,
  },
  {
    id: 4,
    name: 'GE-0',
    teacher: 'Dilnoza Karimova',
    status: 'completed',
    students: 14,
    capacity: 15,
    price: 450000,
  },
  {
    id: 5,
    name: 'Pre-IELTS',
    teacher: 'Sardor Aliyev',
    status: 'cancelled',
    students: 2,
    capacity: 12,
    price: 600000,
  },
]

const WEEK = [
  { day: 'Du', value: 94 },
  { day: 'Se', value: 91 },
  { day: 'Ch', value: 68 },
  { day: 'Pa', value: 89 },
  { day: 'Ju', value: 97 },
  { day: 'Sh', value: 85 },
]

function Kpi({
  label,
  value,
  delta,
  down,
}: {
  label: string
  value: string
  delta: string
  down?: boolean
}) {
  return (
    <Card size="small" style={{ height: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Typography.Text>
      <Flex align="baseline" gap={8} style={{ marginTop: 4 }}>
        <span className="ee-num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
          {value}
        </span>
        <span
          className="ee-num"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: down ? 'var(--ee-text)' : 'var(--ee-text-2)',
          }}
        >
          {delta}
        </span>
      </Flex>
    </Card>
  )
}

/** Uch rangli grafik: oddiy kunlar — slate och, eng yaxshi kun — slate, past kun — amber */
function WeekChart() {
  const max = Math.max(...WEEK.map((d) => d.value))
  const min = Math.min(...WEEK.map((d) => d.value))
  return (
    <Flex vertical gap={8}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${WEEK.length}, 1fr)`,
          gap: 12,
          height: 140,
          alignItems: 'end',
        }}
      >
        {WEEK.map((d) => (
          <Flex
            key={d.day}
            vertical
            align="center"
            gap={4}
            style={{ height: '100%', justifyContent: 'flex-end' }}
          >
            <span className="ee-num" style={{ fontSize: 12, color: 'var(--ee-text-2)' }}>
              {d.value}%
            </span>
            <div
              title={`${d.day}: ${d.value}%`}
              style={{
                width: '100%',
                height: `${d.value}%`,
                borderRadius: '4px 4px 0 0',
                background:
                  d.value === min
                    ? 'var(--ee-accent)'
                    : d.value === max
                      ? 'var(--ee-text)'
                      : 'var(--ee-ink-line)',
              }}
            />
          </Flex>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WEEK.length}, 1fr)`, gap: 12 }}>
        {WEEK.map((d) => (
          <Typography.Text
            key={d.day}
            type="secondary"
            style={{ textAlign: 'center', fontSize: 12 }}
          >
            {d.day}
          </Typography.Text>
        ))}
      </div>
    </Flex>
  )
}

const STATUS_TITLES: Record<StatusKind, string> = {
  group: 'Guruh',
  attendance: 'Davomat',
  examResult: 'Imtihon natijasi',
  homework: 'Uy vazifasi',
  role: 'Rol',
  parentConnection: 'Ota-ona (Telegram)',
  tenant: 'Markaz obunasi',
}

export function UiGalleryPage() {
  const mode = useResolvedThemeMode()
  const setPreference = useThemeModeStore((s) => s.setPreference)
  const [params] = useSearchParams()
  const { message, modal } = App.useApp()
  const palette = getPalette(mode)

  // Skrinshotlar uchun: /dev/ui?theme=dark
  const forced = params.get('theme')
  useEffect(() => {
    if (forced === 'dark' || forced === 'light') setPreference(forced)
  }, [forced, setPreference])

  const columns: DataTableColumn<GroupRow>[] = [
    {
      title: 'Guruh',
      dataIndex: 'name',
      render: (v: string) => <Typography.Link strong>{v}</Typography.Link>,
    },
    { title: "O'qituvchi", dataIndex: 'teacher' },
    {
      title: 'Holati',
      dataIndex: 'status',
      render: (v: string) => <StatusTag kind="group" value={v} />,
    },
    {
      title: "O'quvchilar",
      key: 'students',
      align: 'right',
      render: (_, r) => `${r.students} / ${r.capacity}`,
    },
    {
      title: 'Narxi',
      dataIndex: 'price',
      align: 'right',
      render: (v: number) => `${v.toLocaleString('ru-RU')} so'm`,
    },
    {
      key: 'actions',
      width: 56,
      render: () => <Button type="text" icon={<EditOutlined />} aria-label="Tahrirlash" />,
    },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <BrandMark />
        <ThemeToggle />
      </Flex>

      <PageHeader
        title="Komponentlar galereyasi"
        subtitle="Uch rang qoidasi: barcha komponentlar shu sahifada ko'rib chiqiladi"
        extra={
          <>
            <Button icon={<FilterOutlined />}>Filtr</Button>
            <Button type="primary" icon={<PlusOutlined />}>
              Guruh qo'shish
            </Button>
          </>
        }
      />

      <Flex vertical gap={SECTION_GAP}>
        <Section title="Asosiy ranglar" hint="Namuna dizayn: navy fon, binafsha urg'u">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Swatch name="Oq" value={BASE.white} />
            </Col>
            <Col xs={24} sm={8}>
              <Swatch name="Navy — fon" value={BASE.navy} />
            </Col>
            <Col xs={24} sm={8}>
              <Swatch name="Binafsha — urg'u" value={BASE.violet} />
            </Col>
          </Row>
          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Hosila tuslar ({mode === 'dark' ? "qorong'i" : "yorug'"} rejim)
          </Typography.Title>
          <Row gutter={[16, 16]}>
            {DERIVED.map((d) => (
              <Col key={d.key} xs={12} sm={6} lg={3}>
                <Swatch name={d.name} value={palette[d.key] as string} />
              </Col>
            ))}
          </Row>
        </Section>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Kpi label="Faol guruhlar" value="12" delta="+2" />
          </Col>
          <Col xs={24} sm={8}>
            <Kpi label="O'quvchilar" value="184" delta="+9" />
          </Col>
          <Col xs={24} sm={8}>
            <Kpi label="Bugungi davomat" value="92%" delta="−3%" down />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Section title="Haftalik davomat" hint="Grafik ham uch rangda">
              <WeekChart />
            </Section>
          </Col>
          <Col xs={24} lg={10}>
            <Section title="Tugmalar">
              <Flex vertical gap={12}>
                <Space wrap>
                  <Button type="primary">Saqlash</Button>
                  <Button>Bekor qilish</Button>
                  <Button type="text">Matnli</Button>
                  <Button type="link">Havola</Button>
                </Space>
                <Space wrap>
                  <Button type="primary" danger>
                    O'chirish
                  </Button>
                  <Button danger>O'chirish</Button>
                  <Button icon={<DownloadOutlined />}>Yuklab olish</Button>
                </Space>
                <Space wrap>
                  <Button type="primary" loading>
                    Saqlanmoqda
                  </Button>
                  <Button type="primary" disabled>
                    O'chirilgan
                  </Button>
                  <Button disabled>O'chirilgan</Button>
                </Space>
                <Space wrap>
                  <Button type="primary" size="large">
                    Katta (o'qituvchi, telefon)
                  </Button>
                  <Button size="small">Kichik</Button>
                </Space>
              </Flex>
            </Section>
          </Col>
        </Row>

        <Section title="Holat teglari" hint="5 tur = 3 rang × uslub + belgi">
          <Flex vertical gap={16}>
            <Space wrap>
              <Tag variant="pos">Ijobiy</Tag>
              <Tag variant="prog">Jarayonda</Tag>
              <Tag variant="warn">E'tibor</Tag>
              <Tag variant="neg">Salbiy</Tag>
              <Tag variant="neu">Betaraf</Tag>
            </Space>
            {(Object.keys(STATUS_MAPS) as StatusKind[]).map((kind) => (
              <Flex key={kind} gap={12} align="center" wrap>
                <Typography.Text type="secondary" style={{ width: 150, flex: 'none' }}>
                  {STATUS_TITLES[kind]}
                </Typography.Text>
                <Space wrap size={6}>
                  {statusOptions(kind).map((o) => (
                    <StatusTag key={o.value} kind={kind} value={o.value} />
                  ))}
                </Space>
              </Flex>
            ))}
          </Flex>
        </Section>

        <div>
          <Typography.Title level={5}>Jadval</Typography.Title>
          <DataTable<GroupRow>
            columns={columns}
            data={ROWS}
            searchPlaceholder="Guruh yoki o'qituvchi"
            filters={
              <Select
                allowClear
                placeholder="Holati"
                style={{ width: 200 }}
                options={statusOptions('group')}
              />
            }
            rowSelection={{ defaultSelectedRowKeys: [2] }}
          />
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Section title="Forma">
              <Form layout="vertical" initialValues={{ phone: '+998901234567', role: 'TEACHER' }}>
                <Form.Item label="Ism" required>
                  <Input placeholder="Masalan: Dilnoza" />
                </Form.Item>
                <Form.Item
                  label="Login"
                  validateStatus="error"
                  help="Bu login band. Boshqasini tanlang."
                >
                  <Input defaultValue="admin" />
                </Form.Item>
                <Form.Item label="Telefon" name="phone">
                  <PhoneInput />
                </Form.Item>
                <Form.Item label="Rol" name="role">
                  <Select options={statusOptions('role')} />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Boshlanish sanasi">
                      <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Sig'im">
                      <InputNumber min={1} defaultValue={15} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Fayl">
                  <FileUpload accept={['.pdf', '.doc', '.docx']} maxSizeMB={5} />
                </Form.Item>
                <Flex gap={8} justify="flex-end">
                  <Button>Bekor qilish</Button>
                  <Button type="primary">Saqlash</Button>
                </Flex>
              </Form>
            </Section>
          </Col>
          <Col xs={24} lg={12}>
            <Flex vertical gap={16}>
              <Section title="Boshqaruv elementlari">
                <Flex vertical gap={16}>
                  <Segmented options={['Hafta', 'Oy', 'Yil']} defaultValue="Hafta" />
                  <Radio.Group
                    defaultValue="present"
                    optionType="button"
                    options={statusOptions('attendance').map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                  />
                  <Space wrap size="large">
                    <Checkbox defaultChecked>Hammasi keldi</Checkbox>
                    <Switch defaultChecked /> <span>Ota-onaga xabar yuborish</span>
                  </Space>
                  <Tabs
                    items={[
                      { key: '1', label: "O'quvchilar", children: null },
                      { key: '2', label: 'Darslar', children: null },
                      { key: '3', label: 'Davomat', children: null },
                    ]}
                  />
                  <Pagination defaultCurrent={2} total={50} size="small" />
                </Flex>
              </Section>
              <Section title="Xabarlar">
                <Flex vertical gap={12}>
                  <Alert
                    type="info"
                    showIcon
                    title="Ota-onalarga Telegram orqali xabar yuboriladi"
                  />
                  <Alert type="warning" showIcon title="Guruhda 1 ta joy qoldi" />
                  <Alert
                    type="error"
                    showIcon
                    title="Davomatni saqlab bo'lmadi. Internetni tekshiring."
                  />
                  <Space wrap>
                    <Button onClick={() => message.success("Guruh qo'shildi")}>
                      Muvaffaqiyat xabari
                    </Button>
                    <Button onClick={() => message.error("Saqlab bo'lmadi")}>Xato xabari</Button>
                    <Button
                      onClick={() =>
                        modal.confirm({
                          title: "Guruhni o'chirasizmi?",
                          content: "Bu amalni ortga qaytarib bo'lmaydi.",
                          okText: "O'chirish",
                          okButtonProps: { danger: true },
                          cancelText: 'Bekor qilish',
                        })
                      }
                    >
                      Tasdiq oynasi
                    </Button>
                  </Space>
                </Flex>
              </Section>
            </Flex>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card>
              <Empty description="Hali guruh qo'shilmagan">
                <Button type="primary" icon={<PlusOutlined />}>
                  Birinchi guruhni qo'shish
                </Button>
              </Empty>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card>
              <QueryError error={new Error('demo')} onRetry={() => undefined} />
            </Card>
          </Col>
        </Row>
      </Flex>
    </div>
  )
}
