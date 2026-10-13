import { Alert, App, DatePicker, Form, Input, InputNumber, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo } from 'react'

import { useAuthStore } from '@/features/auth/store'
import type { Group, StatusA5aEnum } from '@/shared/api/generated/model'
import { toApiDate } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { FormDrawer, statusOptions } from '@/shared/ui'

import { FINAL } from './groupMeta'
import { useCourses, useGroups, useSaveGroup, useUsersByRole } from '../api'

interface Values {
  name: string
  course: number
  teacher: number
  start_date: Dayjs
  capacity: number
  status: StatusA5aEnum
}

interface GroupDrawerProps {
  open: boolean
  group: Group | null
  onClose: () => void
  onSaved?: (group: Group) => void
  /** Yangi guruh uchun oldindan tanlangan kurs (Kurslar sahifasidagi "Guruh ochish") */
  defaultCourse?: number
}

export function GroupDrawer({ open, group, onClose, onSaved, defaultCourse }: GroupDrawerProps) {
  const [form] = Form.useForm<Values>()
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'SUPER_ADMIN')
  const courses = useCourses(isSuperAdmin)
  const groups = useGroups()
  const teachers = useUsersByRole('TEACHER')
  const save = useSaveGroup()
  const handleError = useApiErrorHandler()
  const { message, modal } = App.useApp()

  // ADMIN kurslar ro'yxatini ko'ra olmaydi (BACKEND_ISSUES #6) — mavjud guruhlardagi kurslar
  const courseOptions = useMemo(() => {
    if (isSuperAdmin) return (courses.data ?? []).map((c) => ({ value: c.id, label: c.name }))
    const seen = new Map<number, string>()
    for (const g of groups.data ?? []) seen.set(g.course, g.course_name)
    return [...seen].map(([value, label]) => ({ value, label }))
  }, [isSuperAdmin, courses.data, groups.data])

  const initialValues = useMemo<Partial<Values>>(
    () =>
      group
        ? {
            name: group.name,
            course: group.course,
            teacher: group.teacher,
            start_date: dayjs(group.start_date),
            capacity: group.capacity,
            status: group.status,
          }
        : { status: 'recruiting', capacity: 12, course: defaultCourse },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat drawer ochilganda
    [group, open],
  )

  const submit = (v: Values) => {
    const startChanged = !group || toApiDate(v.start_date) !== group.start_date
    save.mutate(
      {
        id: group?.id,
        data: {
          name: v.name.trim(),
          course: v.course,
          teacher: v.teacher,
          capacity: v.capacity,
          status: v.status,
          // Backend o'tgan sanani rad etadi — o'zgarmagan bo'lsa yubormaymiz (BACKEND_ISSUES #19)
          ...(startChanged ? { start_date: toApiDate(v.start_date) } : {}),
        },
      },
      {
        onSuccess: (saved) => {
          message.success(group ? 'Guruh saqlandi' : 'Guruh yaratildi')
          onClose()
          onSaved?.(saved)
        },
        onError: (e) => handleError(e, form),
      },
    )
  }

  const onSubmit = (v: Values) => {
    if (group && FINAL.includes(v.status) && v.status !== group.status) {
      modal.confirm({
        title: v.status === 'completed' ? 'Guruh tugallansinmi?' : 'Guruh bekor qilinsinmi?',
        content:
          "Shundan keyin guruhni, uning jadvali va darslarini o'zgartirib bo'lmaydi, talaba qo'shib ham bo'lmaydi.",
        okText: 'Ha, saqlash',
        okButtonProps: { danger: true },
        cancelText: 'Ortga',
        onOk: () => submit(v),
      })
      return
    }
    submit(v)
  }

  const minCapacity = Math.max(1, group?.active_students_count ?? 0)

  return (
    <FormDrawer<Values>
      open={open}
      title={group ? 'Guruhni tahrirlash' : 'Yangi guruh'}
      form={form}
      initialValues={initialValues}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitText={group ? 'Saqlash' : 'Yaratish'}
    >
      <Form.Item
        name="name"
        label="Guruh nomi"
        rules={[{ required: true, whitespace: true, message: 'Nomini kiriting' }, { max: 100 }]}
      >
        <Input maxLength={100} placeholder="GE-2" />
      </Form.Item>
      <Form.Item
        name="course"
        label="Kurs"
        extra={
          !isSuperAdmin
            ? "Faqat mavjud guruhlardagi kurslar ko'rinadi (yangi kursni markaz egasi qo'shadi)"
            : undefined
        }
        rules={[{ required: true, message: 'Kursni tanlang' }]}
      >
        <Select
          placeholder="Kursni tanlang"
          options={courseOptions}
          loading={courses.isLoading || groups.isLoading}
          showSearch
          optionFilterProp="label"
          notFoundContent="Kurs yo'q"
        />
      </Form.Item>
      <Form.Item
        name="teacher"
        label="O'qituvchi"
        rules={[{ required: true, message: "O'qituvchini tanlang" }]}
      >
        <Select
          placeholder="O'qituvchini tanlang"
          loading={teachers.isLoading}
          showSearch
          optionFilterProp="label"
          notFoundContent="O'qituvchi yo'q — avval Foydalanuvchilar bo'limida qo'shing"
          options={(teachers.data ?? []).map((t) => ({
            value: t.id,
            label: [t.first_name, t.last_name].filter(Boolean).join(' ') || t.username,
          }))}
        />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Form.Item
          name="start_date"
          label="Boshlanish sanasi"
          rules={[{ required: true, message: 'Sanani tanlang' }]}
        >
          <DatePicker
            format="DD.MM.YYYY"
            style={{ width: '100%' }}
            // Backend o'tgan sanani qabul qilmaydi
            disabledDate={(d) => d.isBefore(dayjs(), 'day')}
          />
        </Form.Item>
        <Form.Item
          name="capacity"
          label="Sig'im"
          extra={group ? `Kamida ${minCapacity} (hozirgi talabalar)` : undefined}
          rules={[{ required: true, message: "Sig'imni kiriting" }]}
        >
          <InputNumber
            min={minCapacity}
            max={500}
            precision={0}
            style={{ width: '100%' }}
            suffix="o'rin"
          />
        </Form.Item>
      </div>
      <Form.Item name="status" label="Holati" rules={[{ required: true }]}>
        <Select options={statusOptions('group')} />
      </Form.Item>
      {group?.end_date && (
        <Alert
          type="info"
          showIcon
          title={`Tugash sanasi: ${dayjs(group.end_date).format('DD.MM.YYYY')}`}
          description="Holat tugallangan, to'xtatilgan yoki bekor qilinganda avtomatik yoziladi."
        />
      )}
    </FormDrawer>
  )
}
