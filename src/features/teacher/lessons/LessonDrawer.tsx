import { Alert, App, DatePicker, Form, Input, InputNumber, Select, TimePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo } from 'react'

import type { Lesson, TeacherGroupList } from '@/shared/api/generated/model'
import { formatDate, parseApiTime, toApiDate, toApiTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { FormDrawer } from '@/shared/ui'

import { useSaveLesson, useTeacherGroup } from '../api'

interface Values {
  group: number
  lesson_number: number
  title: string
  description?: string
  date: Dayjs
  start_time: Dayjs
  end_time: Dayjs
}

/** dayjs().day(): 0 — yakshanba */
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Backend: yakunlangan yoki bekor qilingan guruhga dars qo'shib/o'zgartirib bo'lmaydi */
const isClosed = (g: TeacherGroupList) => g.status === 'completed' || g.status === 'cancelled'

interface LessonDrawerProps {
  open: boolean
  lesson: Lesson | null
  groups: TeacherGroupList[]
  /** Barcha darslar — keyingi dars raqamini taklif qilish uchun */
  lessons: Lesson[]
  /** Yangi dars uchun oldindan tanlangan guruh */
  defaultGroup?: number
  onClose: () => void
}

export function LessonDrawer({
  open,
  lesson,
  groups,
  lessons,
  defaultGroup,
  onClose,
}: LessonDrawerProps) {
  const [form] = Form.useForm<Values>()
  const save = useSaveLesson()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  const groupId = Form.useWatch('group', form)
  const group = useTeacherGroup(groupId)

  const nextNumber = (gid?: number) =>
    Math.max(0, ...lessons.filter((l) => l.group === gid).map((l) => l.lesson_number)) + 1

  const initialValues = useMemo<Partial<Values>>(() => {
    if (lesson) {
      return {
        group: lesson.group,
        lesson_number: lesson.lesson_number,
        title: lesson.title,
        description: lesson.description ?? '',
        date: dayjs(lesson.date),
        start_time: parseApiTime(lesson.start_time),
        end_time: parseApiTime(lesson.end_time),
      }
    }
    const open = groups.filter((g) => !isClosed(g))
    const gid = defaultGroup ?? (open.length === 1 ? open[0].id : undefined)
    return gid ? { group: gid, lesson_number: nextNumber(gid) } : {}
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat drawer ochilganda hisoblanadi
  }, [lesson, open])

  /** Guruh jadvalida shu kun bo'lsa — vaqtlarni avtomatik to'ldiramiz (bo'sh bo'lsa) */
  const fillFromSchedule = (date?: Dayjs | null) => {
    if (!date || !group.data) return
    const slot = group.data.schedules.find((s) => s.day_of_week === WEEKDAYS[date.day()])
    if (!slot) return
    if (!form.getFieldValue('start_time'))
      form.setFieldValue('start_time', parseApiTime(slot.start_time))
    if (!form.getFieldValue('end_time')) form.setFieldValue('end_time', parseApiTime(slot.end_time))
  }

  const start = group.data?.start_date ? dayjs(group.data.start_date) : null
  const end = group.data?.end_date ? dayjs(group.data.end_date) : null

  const onSubmit = (v: Values) =>
    save.mutate(
      {
        id: lesson?.id,
        data: {
          group: v.group,
          lesson_number: v.lesson_number,
          title: v.title.trim(),
          description: v.description?.trim() ?? '',
          date: toApiDate(v.date),
          start_time: toApiTime(v.start_time),
          end_time: toApiTime(v.end_time),
        },
      },
      {
        onSuccess: () => {
          message.success(lesson ? 'Dars yangilandi' : "Dars qo'shildi")
          onClose()
        },
        onError: (e) => handleError(e, form),
      },
    )

  return (
    <FormDrawer<Values>
      open={open}
      title={lesson ? 'Darsni tahrirlash' : 'Yangi dars'}
      form={form}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={save.isPending}
      initialValues={initialValues}
      submitText={lesson ? 'Saqlash' : "Qo'shish"}
    >
      <Form.Item
        name="group"
        label="Guruh"
        rules={[{ required: true, message: 'Guruhni tanlang' }]}
      >
        <Select
          placeholder="Guruhni tanlang"
          disabled={!!lesson}
          onChange={(gid: number) => {
            form.setFieldValue('lesson_number', nextNumber(gid))
            form.setFieldValue('date', undefined)
          }}
          options={groups.map((g) => ({
            value: g.id,
            label: g.name,
            disabled: isClosed(g),
            title: isClosed(g) ? `${g.status_display} — dars qo'shib bo'lmaydi` : undefined,
          }))}
        />
      </Form.Item>
      {group.data && group.data.schedules.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`Jadval: ${group.data.schedules
            .map(
              (s) =>
                `${s.day_of_week_display} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
            )
            .join(', ')}`}
          description="Jadvaldagi kun tanlansa, vaqt avtomatik to'ldiriladi."
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: 12 }}>
        <Form.Item
          name="lesson_number"
          label="Dars №"
          dependencies={['group']}
          rules={[
            { required: true, message: 'Raqam kiriting' },
            ({ getFieldValue }) => ({
              // Backend unique_together xatosini inglizcha qaytaradi — oldindan tekshiramiz
              validator: (_, v?: number) =>
                lessons.some(
                  (l) =>
                    l.group === getFieldValue('group') &&
                    l.lesson_number === v &&
                    l.id !== lesson?.id,
                )
                  ? Promise.reject(new Error(`${v}-dars bu guruhda bor`))
                  : Promise.resolve(),
            }),
          ]}
        >
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="title"
          label="Mavzu"
          rules={[{ required: true, whitespace: true, message: 'Mavzuni kiriting' }, { max: 200 }]}
        >
          <Input maxLength={200} placeholder="Present Perfect" />
        </Form.Item>
      </div>
      <Form.Item name="description" label="Tavsif">
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="Darsda nimalar o'tiladi"
        />
      </Form.Item>
      <Form.Item
        name="date"
        label="Sana"
        extra={start ? `Guruh ${formatDate(group.data?.start_date)} da boshlangan` : undefined}
        rules={[{ required: true, message: 'Sanani tanlang' }]}
      >
        <DatePicker
          format="DD.MM.YYYY"
          style={{ width: '100%' }}
          disabled={!groupId}
          onChange={fillFromSchedule}
          disabledDate={(d) =>
            (!!start && d.isBefore(start, 'day')) || (!!end && d.isAfter(end, 'day'))
          }
        />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Form.Item
          name="start_time"
          label="Boshlanishi"
          rules={[{ required: true, message: 'Vaqtni tanlang' }]}
        >
          <TimePicker format="HH:mm" minuteStep={5} needConfirm={false} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="end_time"
          label="Tugashi"
          dependencies={['start_time']}
          rules={[
            { required: true, message: 'Vaqtni tanlang' },
            ({ getFieldValue }) => ({
              validator: (_, v?: Dayjs) => {
                const s: Dayjs | undefined = getFieldValue('start_time')
                return !v || !s || v.format('HH:mm') > s.format('HH:mm')
                  ? Promise.resolve()
                  : Promise.reject(new Error("Boshlanishidan keyin bo'lsin"))
              },
            }),
          ]}
        >
          <TimePicker format="HH:mm" minuteStep={5} needConfirm={false} style={{ width: '100%' }} />
        </Form.Item>
      </div>
    </FormDrawer>
  )
}
