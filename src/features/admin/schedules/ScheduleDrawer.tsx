import { DeleteOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Form, Input, Popconfirm, Select, TimePicker } from 'antd'
import type { Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'

import type { DayOfWeekEnum, Group, Schedule } from '@/shared/api/generated/model'
import { formatTime, parseApiTime, toApiTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { FormDrawer } from '@/shared/ui'

import { useDeleteSchedule, useSaveSchedule } from '../api'
import { isClosedGroup } from '../groups/groupMeta'
import { DAYS, findConflicts } from './scheduleMeta'

interface Values {
  group: number
  days: DayOfWeekEnum[]
  start_time: Dayjs
  end_time: Dayjs
  room?: string
}

interface ScheduleDrawerProps {
  open: boolean
  schedule: Schedule | null
  groups: Group[]
  schedules: Schedule[]
  /** Guruh sahifasidan ochilganda guruh tanlangan va o'zgarmaydi */
  fixedGroup?: number
  /** Jadval katagidan bosilganda: kun va vaqt */
  preset?: Partial<Pick<Schedule, 'day_of_week' | 'start_time' | 'end_time'>>
  onClose: () => void
}

/** Odatiy dars davomiyligi — boshlanish tanlanganda tugash shu bilan to'ldiriladi */
const LESSON_MINUTES = 90

const ODD_DAYS: DayOfWeekEnum[] = ['monday', 'wednesday', 'friday']
const EVEN_DAYS: DayOfWeekEnum[] = ['tuesday', 'thursday', 'saturday']

export function ScheduleDrawer({
  open,
  schedule,
  groups,
  schedules,
  fixedGroup,
  preset,
  onClose,
}: ScheduleDrawerProps) {
  const [form] = Form.useForm<Values>()
  const save = useSaveSchedule()
  const remove = useDeleteSchedule()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  const [saving, setSaving] = useState(false)
  const values = Form.useWatch([], form) as Partial<Values> | undefined
  const isEdit = schedule !== null

  const conflicts =
    values?.group && values.days?.length && values.start_time && values.end_time
      ? values.days.flatMap((day) =>
          findConflicts(
            schedules,
            {
              group: values.group!,
              day_of_week: day,
              start_time: toApiTime(values.start_time!),
              end_time: toApiTime(values.end_time!),
              room: values.room,
            },
            schedule?.id,
          ),
        )
      : []

  const initialValues = useMemo<Partial<Values>>(() => {
    const src = schedule ?? preset
    return {
      group: schedule?.group ?? fixedGroup,
      days: src?.day_of_week ? [src.day_of_week] : [],
      start_time: parseApiTime(src?.start_time),
      end_time: parseApiTime(src?.end_time),
      room: schedule?.room ?? '',
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat oyna ochilganda
  }, [schedule, open])

  const onSubmit = async (v: Values) => {
    const base = {
      group: v.group,
      start_time: toApiTime(v.start_time),
      end_time: toApiTime(v.end_time),
      room: v.room?.trim() ?? '',
    }
    setSaving(true)
    try {
      if (isEdit) {
        await save.mutateAsync({ id: schedule.id, data: { ...base, day_of_week: v.days[0] } })
        message.success('Jadval saqlandi')
      } else {
        // Har bir tanlangan kun — alohida dars (backendda bittalab yaratiladi)
        for (const day of v.days) {
          await save.mutateAsync({ data: { ...base, day_of_week: day } })
        }
        message.success(
          v.days.length > 1 ? `Jadvalga ${v.days.length} ta dars qo'shildi` : "Jadvalga qo'shildi",
        )
      }
      onClose()
    } catch (e) {
      handleError(e, form)
    } finally {
      setSaving(false)
    }
  }

  const groupName = new Map(groups.map((g) => [g.id, g.name]))

  return (
    <FormDrawer<Values>
      open={open}
      title={isEdit ? 'Darsni tahrirlash' : "Jadvalga dars qo'shish"}
      form={form}
      initialValues={initialValues}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={saving}
      submitText={isEdit ? 'Saqlash' : "Qo'shish"}
      footerExtra={
        isEdit && (
          <Popconfirm
            title="Dars jadvaldan o'chirilsinmi?"
            okText="O'chirish"
            okButtonProps={{ danger: true }}
            cancelText="Bekor qilish"
            onConfirm={() =>
              remove
                .mutateAsync(schedule.id)
                .then(() => {
                  message.success("O'chirildi")
                  onClose()
                })
                .catch((e) => handleError(e))
            }
          >
            <Button danger type="text" icon={<DeleteOutlined />} loading={remove.isPending}>
              O'chirish
            </Button>
          </Popconfirm>
        )
      }
    >
      <Form.Item
        name="group"
        label="Guruh"
        rules={[{ required: true, message: 'Guruhni tanlang' }]}
      >
        <Select
          placeholder="Guruhni tanlang"
          disabled={!!fixedGroup}
          showSearch
          optionFilterProp="label"
          options={groups.map((g) => ({
            value: g.id,
            label: `${g.name} · ${g.course_name}`,
            // Backend: tugallangan/bekor qilingan guruhga jadval biriktirib bo'lmaydi
            disabled: isClosedGroup(g),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="days"
        label={isEdit ? 'Hafta kuni' : 'Hafta kunlari'}
        rules={[{ required: true, type: 'array', min: 1, message: 'Kunni tanlang' }]}
      >
        <DayPicker multiple={!isEdit} />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Form.Item
          name="start_time"
          label="Boshlanishi"
          rules={[{ required: true, message: 'Vaqtni tanlang' }]}
        >
          <TimePicker
            format="HH:mm"
            minuteStep={5}
            needConfirm={false}
            style={{ width: '100%' }}
            onChange={(v: Dayjs | null) => {
              // Tugash vaqti bo'sh bo'lsa — odatiy dars uzunligi bilan to'ldiramiz
              if (v && !form.getFieldValue('end_time'))
                form.setFieldValue('end_time', v.add(LESSON_MINUTES, 'minute'))
            }}
          />
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
      <Form.Item name="room" label="Xona" rules={[{ max: 100 }]}>
        <Input maxLength={100} placeholder="Masalan: 101" />
      </Form.Item>
      {conflicts.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title="Vaqt to'qnashuvi"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {conflicts.map((c) => (
                <li key={c.id}>
                  {DAYS.find((d) => d.value === c.day_of_week)?.label},{' '}
                  {groupName.get(c.group) ?? c.group_name}, {formatTime(c.start_time)}–
                  {formatTime(c.end_time)}
                  {c.room && `, ${c.room}-xona`}
                  {c.group === values?.group ? ' — shu guruhning boshqa darsi' : ' — xona band'}
                </li>
              ))}
            </ul>
          }
        />
      )}
    </FormDrawer>
  )
}

/** Hafta kunlari tugmalari. Yaratishda bir nechta + "toq/juft kunlar", tahrirlashda bitta */
function DayPicker({
  value = [],
  onChange,
  multiple,
}: {
  value?: DayOfWeekEnum[]
  onChange?: (v: DayOfWeekEnum[]) => void
  multiple: boolean
}) {
  const toggle = (day: DayOfWeekEnum) => {
    if (!multiple) return onChange?.([day])
    onChange?.(value.includes(day) ? value.filter((d) => d !== day) : [...value, day])
  }
  const same = (set: DayOfWeekEnum[]) =>
    value.length === set.length && set.every((d) => value.includes(d))

  return (
    <Flex vertical gap={8}>
      <Flex gap={6} wrap role="group" aria-label="Hafta kunlari">
        {DAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            className={`ee-pill ee-pill--sm${value.includes(d.value) ? ' is-on' : ''}`}
            aria-pressed={value.includes(d.value)}
            title={d.label}
            onClick={() => toggle(d.value)}
          >
            {d.short}
          </button>
        ))}
      </Flex>
      {multiple && (
        <Flex gap={6} wrap>
          <button
            type="button"
            className={`ee-pill ee-pill--ghost${same(ODD_DAYS) ? ' is-on' : ''}`}
            onClick={() => onChange?.(ODD_DAYS)}
          >
            Toq kunlar (Du, Chor, Ju)
          </button>
          <button
            type="button"
            className={`ee-pill ee-pill--ghost${same(EVEN_DAYS) ? ' is-on' : ''}`}
            onClick={() => onChange?.(EVEN_DAYS)}
          >
            Juft kunlar (Se, Pay, Sha)
          </button>
        </Flex>
      )}
    </Flex>
  )
}
