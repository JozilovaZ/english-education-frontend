import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { App, Button, Dropdown, Empty, Flex, Form, Input, InputNumber, Skeleton } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'

import { adminKeys, useCourses, useGroups } from '@/features/admin/api'
import { isClosedGroup } from '@/features/admin/groups/groupMeta'
import {
  getEducationsCoursesListQueryKey,
  useEducationsCoursesCreate,
  useEducationsCoursesDestroy,
  useEducationsCoursesPartialUpdate,
} from '@/shared/api/generated/endpoints/courses/courses'
import type { Course, Group } from '@/shared/api/generated/model'
import { formatMoney, parseDuration, toApiDuration } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { FormDrawer, PageHeader, QueryError, Tag, useFormDrawer } from '@/shared/ui'

interface CourseForm {
  name: string
  description?: string
  price: number
  duration_days: number
  lesson_quantity: number
}

// Backend: DecimalField(max_digits=5, decimal_places=2) — BACKEND_ISSUES #10
const MAX_PRICE = 999.99

/** Davomiylik tez tanlovlari (kun) */
const DURATION_PRESETS: [number, string][] = [
  [30, '1 oy'],
  [60, '2 oy'],
  [90, '3 oy'],
  [180, '6 oy'],
]

/** 90 → "90 kun · 3 oy" (oyga bo'linmasa faqat kun) */
function durationLabel(days: number) {
  return days >= 30 && days % 30 === 0 ? `${days} kun · ${days / 30} oy` : `${days} kun`
}

/** Haftasiga taxminan nechta dars */
function perWeek(lessons?: number, days?: number) {
  if (!lessons || !days) return null
  return Math.round((lessons / (days / 7)) * 10) / 10
}

export function CoursesPage() {
  const courses = useCourses()
  const groups = useGroups()
  const drawer = useFormDrawer<Course>({ openOnNew: true })
  const [form] = Form.useForm<CourseForm>()
  const handleError = useApiErrorHandler()
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useUrlState()
  const search = (params.get('search') ?? '').toLowerCase()

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.courses }),
      queryClient.invalidateQueries({ queryKey: getEducationsCoursesListQueryKey() }),
    ])

  const create = useEducationsCoursesCreate()
  const update = useEducationsCoursesPartialUpdate()
  const remove = useEducationsCoursesDestroy()

  const groupsOf = (courseId: number) => (groups.data ?? []).filter((g) => g.course === courseId)

  // Barqaror obyekt bo'lishi shart: aks holda FormDrawer har renderda formani qayta to'ldiradi
  const initialValues = useMemo<Partial<CourseForm> | undefined>(() => {
    const c = drawer.record
    if (!c) return undefined
    return {
      name: c.name,
      description: c.description ?? '',
      price: Number(c.price),
      duration_days: parseDuration(c.duration).days,
      lesson_quantity: c.lesson_quantity,
    }
  }, [drawer.record])

  // Formadagi qiymatlar — tez tanlov va "haftasiga ≈ N dars" izohi uchun
  const days = Form.useWatch('duration_days', form)
  const lessons = Form.useWatch('lesson_quantity', form)
  const weekly = perWeek(lessons, days)

  const onSubmit = (values: CourseForm) => {
    const data = {
      name: values.name.trim(),
      description: values.description?.trim() ?? '',
      price: values.price.toFixed(2),
      duration: toApiDuration({ days: values.duration_days }),
      lesson_quantity: values.lesson_quantity,
    }
    const options = {
      onSuccess: () => {
        message.success(drawer.isEdit ? 'Kurs saqlandi' : "Kurs qo'shildi")
        drawer.close()
        void invalidate()
      },
      onError: (error: unknown) => handleError(error, form),
    }
    if (drawer.record) {
      update.mutate({ id: drawer.record.id, data }, options)
    } else {
      create.mutate({ data }, options)
    }
  }

  const confirmDelete = (course: Course) => {
    // Backend guruhi bor kursni o'chirmaydi — oldindan aytamiz
    const linked = groupsOf(course.id).length
    if (linked) {
      modal.info({
        title: `"${course.name}" kursini o'chirib bo'lmaydi`,
        content: `Unga ${linked} ta guruh bog'langan. Avval guruhlarni boshqa kursga o'tkazing.`,
        okText: 'Tushunarli',
      })
      return
    }
    modal.confirm({
      title: `"${course.name}" kursini o'chirasizmi?`,
      okText: "O'chirish",
      okButtonProps: { danger: true },
      cancelText: 'Ortga',
      onOk: () =>
        remove
          .mutateAsync({ id: course.id })
          .then(() => {
            message.success("Kurs o'chirildi")
            return invalidate()
          })
          .catch((error) => handleError(error)),
    })
  }

  const all = courses.data ?? []
  const rows = all.filter(
    (c) => !search || [c.name, c.description ?? ''].some((v) => v.toLowerCase().includes(search)),
  )
  const openGroups = (groups.data ?? []).filter((g) => !isClosedGroup(g))

  return (
    <>
      <PageHeader
        eyebrow={`${all.length} ta kurs · ${openGroups.length} ta faol guruh`}
        title="Kurslar"
        subtitle="Kursni bosing — tahrirlaysiz. Yangi guruhni shu yerdan ham ochish mumkin"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={drawer.openCreate}
          >
            Kurs qo'shish
          </Button>
        }
      />

      {all.length > 3 && (
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: 'var(--ee-text-3)' }} />}
          placeholder="Kurs nomi yoki tavsifi"
          value={params.get('search') ?? ''}
          onChange={(e) => setParams({ search: e.target.value || null })}
          style={{ maxWidth: 320, marginBottom: 16 }}
        />
      )}

      {courses.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : courses.isError ? (
        <QueryError error={courses.error} onRetry={() => courses.refetch()} />
      ) : rows.length === 0 && all.length ? (
        <div className="ee-panel">
          <Empty description="Kurs topilmadi" />
        </div>
      ) : (
        <div className="ee-group-grid">
          {rows.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              groups={groupsOf(c.id)}
              onEdit={() => drawer.openEdit(c)}
              onDelete={() => confirmDelete(c)}
              onNewGroup={() => navigate(`/admin/groups?new=1&course=${c.id}`)}
            />
          ))}
          <button type="button" className="ee-group-new" onClick={drawer.openCreate}>
            <PlusOutlined />
            {all.length ? 'Yangi kurs' : "Birinchi kursni qo'shing"}
          </button>
        </div>
      )}

      <FormDrawer<CourseForm>
        open={drawer.open}
        title={drawer.isEdit ? 'Kursni tahrirlash' : 'Yangi kurs'}
        form={form}
        initialValues={initialValues}
        onClose={drawer.close}
        onSubmit={onSubmit}
        submitting={create.isPending || update.isPending}
        submitText={drawer.isEdit ? 'Saqlash' : "Qo'shish"}
      >
        <Form.Item
          name="name"
          label="Nomi"
          rules={[
            { required: true, whitespace: true, message: 'Kurs nomini kiriting' },
            { max: 50 },
          ]}
        >
          <Input placeholder="General English" maxLength={50} showCount />
        </Form.Item>
        <Form.Item name="description" label="Tavsif" rules={[{ max: 256 }]}>
          <Input.TextArea
            rows={2}
            maxLength={256}
            showCount
            placeholder="Masalan: boshlang'ich daraja, A1–A2"
          />
        </Form.Item>
        <Form.Item
          name="price"
          label="Narxi (so'm)"
          rules={[{ required: true, message: 'Narxni kiriting' }]}
          extra={`Hozircha tizim ${MAX_PRICE} dan katta narxni qabul qilmaydi`}
        >
          <InputNumber min={0} max={MAX_PRICE} precision={2} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Davomiyligi" required>
          <Form.Item
            name="duration_days"
            noStyle
            rules={[{ required: true, message: 'Davomiylikni kiriting' }]}
          >
            <InputNumber min={1} max={3650} precision={0} style={{ width: '100%' }} suffix="kun" />
          </Form.Item>
          <Flex gap={6} wrap style={{ marginTop: 8 }}>
            {DURATION_PRESETS.map(([d, label]) => (
              <button
                key={d}
                type="button"
                className={`ee-pill${days === d ? ' is-on' : ''}`}
                style={{ minHeight: 30, padding: '0 12px', fontSize: 13 }}
                onClick={() => form.setFieldValue('duration_days', d)}
              >
                {label}
              </button>
            ))}
          </Flex>
        </Form.Item>
        <Form.Item
          name="lesson_quantity"
          label="Darslar soni"
          rules={[{ required: true, message: 'Darslar sonini kiriting' }]}
          extra={weekly ? `Haftasiga taxminan ${weekly} ta dars` : undefined}
        >
          <InputNumber min={1} max={32767} precision={0} style={{ width: '100%' }} suffix="ta" />
        </Form.Item>
      </FormDrawer>
    </>
  )
}

function CourseCard({
  course: c,
  groups,
  onEdit,
  onDelete,
  onNewGroup,
}: {
  course: Course
  groups: Group[]
  onEdit: () => void
  onDelete: () => void
  onNewGroup: () => void
}) {
  const days = parseDuration(c.duration).days
  const weekly = perWeek(c.lesson_quantity, days)
  const open = groups.filter((g) => !isClosedGroup(g))
  const students = open.reduce((s, g) => s + g.active_students_count, 0)

  return (
    <article className="ee-panel ee-group-card">
      {/* Butun kartochka — tahrirlash; ichidagi tugma va havolalar uning ustida */}
      <button
        type="button"
        className="ee-group-card__link"
        aria-label={`${c.name} — tahrirlash`}
        onClick={onEdit}
        style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}
      />
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div style={{ minWidth: 0 }}>
          <h2 className="ee-group-card__title">{c.name}</h2>
          <span
            className="ee-muted"
            style={{
              fontSize: 13,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {c.description || 'Tavsif yozilmagan'}
          </span>
        </div>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash' },
              { key: 'delete', icon: <DeleteOutlined />, label: "O'chirish", danger: true },
            ],
            onClick: ({ key }) => (key === 'edit' ? onEdit() : onDelete()),
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            aria-label="Amallar"
            style={{ position: 'relative', zIndex: 1 }}
          />
        </Dropdown>
      </Flex>

      <span className="ee-num" style={{ font: '800 24px/28px var(--ee-font)' }}>
        {formatMoney(c.price)}
      </span>

      <dl className="ee-facts ee-facts--sm" style={{ margin: 0 }}>
        <div>
          <dt>Davomiyligi</dt>
          <dd>{durationLabel(days)}</dd>
        </div>
        <div>
          <dt>Darslar</dt>
          <dd>
            {c.lesson_quantity} ta{weekly ? ` · haftasiga ≈${weekly}` : ''}
          </dd>
        </div>
      </dl>

      <div className="ee-group-card__schedule">
        <TeamOutlined />
        {open.length ? (
          <span style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'block', marginBottom: 6 }}>
              {open.length} ta guruh · {students} ta o'quvchi
            </span>
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
              {open.map((g) => (
                <Link key={g.id} to={`/admin/groups/${g.id}`}>
                  <Tag variant="prog">{g.name}</Tag>
                </Link>
              ))}
            </span>
          </span>
        ) : (
          <span className="ee-muted">Hozir faol guruh yo'q</span>
        )}
      </div>

      <Button
        icon={<PlusOutlined />}
        onClick={onNewGroup}
        style={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}
      >
        Guruh ochish
      </Button>
    </article>
  )
}
