import {
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Tooltip,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  durationToSeconds,
  formatDuration,
  formatShortDateTime,
  formatTimeLeft,
} from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { FormDrawer, PageHeader, QueryError, Tag, useFormDrawer } from '@/shared/ui'

import {
  useDeleteExam,
  useSaveExam,
  useTeacherAttempts,
  useTeacherExams,
  useTeacherGroups,
  type TeacherExam,
} from '../api'

type Status = 'active' | 'done' | 'off'

const STATUS: Record<Status, { variant: 'prog' | 'warn' | 'neu'; label: string }> = {
  active: { variant: 'prog', label: 'Faol' },
  done: { variant: 'warn', label: 'Yakunlangan' },
  off: { variant: 'neu', label: 'Nofaol' },
}

const examStatus = (e: TeacherExam): Status =>
  !e.is_active ? 'off' : e.is_expired ? 'done' : 'active'

/** Imtihon vaqti tez tanlovlari (daqiqa) */
const DURATION_PRESETS: [number, string][] = [
  [20, '20 daq'],
  [45, '45 daq'],
  [60, '1 soat'],
  [120, '2 soat'],
]

/** Daqiqa → backend "HH:MM:SS" */
const minutesToHms = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`

/** O'qituvchi imtihonlari: ro'yxat + yaratish/tahrirlash oynasi */
export function TeacherExamsPage() {
  const groups = useTeacherGroups()
  const exams = useTeacherExams()
  const attempts = useTeacherAttempts()
  const remove = useDeleteExam()
  const handleError = useApiErrorHandler()
  const navigate = useNavigate()
  const { modal } = App.useApp()
  const [params, setParams] = useUrlState()
  const drawer = useFormDrawer<TeacherExam>({ openOnNew: true })

  if (groups.isPending || exams.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (groups.isError) return <QueryError error={groups.error} onRetry={() => groups.refetch()} />
  if (exams.isError) return <QueryError error={exams.error} onRetry={() => exams.refetch()} />

  const groupList = groups.data
  const groupId = Number(params.get('group')) || (groupList.length === 1 ? groupList[0].id : 0)
  const group = groupList.find((g) => g.id === groupId)
  const status = (params.get('status') ?? '') as Status | ''

  const base = exams.data.filter((e) => !groupId || e.group === groupId)
  const count = (s: Status) => base.filter((e) => examStatus(e) === s).length
  // Faollari muddati yaqini birinchi, qolganlari eng yangisi birinchi
  const list = base
    .filter((e) => !status || examStatus(e) === status)
    .sort((a, b) => {
      const sa = examStatus(a) === 'active'
      const sb = examStatus(b) === 'active'
      if (sa !== sb) return sa ? -1 : 1
      return sa
        ? dayjs(a.deadline).diff(dayjs(b.deadline))
        : dayjs(b.deadline).diff(dayjs(a.deadline))
    })

  // Har bir imtihon bo'yicha yakunlangan urinishlar soni
  const doneByExam = new Map<number, number>()
  for (const a of attempts.data ?? []) {
    if (a.is_completed) doneByExam.set(a.exam, (doneByExam.get(a.exam) ?? 0) + 1)
  }
  const studentsByGroup = new Map(groupList.map((g) => [g.id, g.active_students_count ?? 0]))

  const confirmDelete = (e: TeacherExam) =>
    modal.confirm({
      title: `"${e.name}" imtihonini o'chirasizmi?`,
      content: "Savollar va talabalar natijalari ham o'chadi.",
      okText: "O'chirish",
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true },
      onOk: () => remove.mutateAsync(e.id).catch(handleError),
    })

  return (
    <>
      <PageHeader
        eyebrow={
          group
            ? `${group.name} · ${group.active_students_count ?? 0} talaba`
            : `${groupList.length} ta guruh`
        }
        title="Imtihonlar"
        subtitle="Imtihonni bosing — savollarini tahrirlaysiz. Natijalar «⋮» menyusida"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={drawer.openCreate}
          >
            Imtihon yaratish
          </Button>
        }
      />

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        {groupList.length > 1 && (
          <Segmented
            value={groupId}
            onChange={(v) => setParams({ group: v || null })}
            options={[
              { value: 0, label: 'Barcha guruhlar' },
              ...groupList.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        )}
        <Segmented
          value={status}
          onChange={(v) => setParams({ status: v || null })}
          options={[
            { value: '', label: `Hammasi · ${base.length}` },
            ...(Object.keys(STATUS) as Status[])
              .filter((s) => count(s) > 0 || s === status)
              .map((s) => ({ value: s, label: `${STATUS[s].label} · ${count(s)}` })),
          ]}
        />
      </Flex>

      {list.length === 0 ? (
        <div className="ee-panel">
          <Empty
            description={base.length ? "Bu holatda imtihon yo'q" : 'Hali imtihon yaratilmagan'}
          >
            {!base.length && (
              <Button type="primary" icon={<PlusOutlined />} onClick={drawer.openCreate}>
                Birinchi imtihonni yaratish
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ee-table ee-table--compact">
            <thead>
              <tr>
                <th>Imtihon</th>
                <th>Muddat</th>
                <th>Vaqt</th>
                <th>O'tish bali</th>
                <th>Topshirdi</th>
                <th>Holati</th>
                <th aria-label="Harakatlar" />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const s = examStatus(e)
                const lowTotal = e.questions_count > 0 && (e.passing_score ?? 0) > e.total_points
                const done = doneByExam.get(e.id) ?? 0
                const size = studentsByGroup.get(e.group) ?? 0
                const left = s === 'active' ? formatTimeLeft(e.deadline) : null
                return (
                  <tr
                    key={e.id}
                    style={{ cursor: 'pointer' }}
                    onClick={(ev) => {
                      // Havola, tugma yoki menyu bosilganda qator bosilmaydi
                      if ((ev.target as HTMLElement).closest('a, button, .ant-dropdown')) return
                      navigate(`/teacher/exams/${e.id}/questions`)
                    }}
                  >
                    <td style={{ minWidth: 200 }}>
                      <Link to={`/teacher/exams/${e.id}/questions`} className="ee-row-title">
                        {e.name}
                      </Link>
                      <div className="ee-muted" style={{ fontSize: 13 }}>
                        {!groupId && `${e.group_name} · `}
                        {e.questions_count ? (
                          `${e.questions_count} savol · ${e.total_points} ball`
                        ) : (
                          <span>Savol qo'shilmagan</span>
                        )}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="ee-num" style={{ display: 'block' }}>
                        {formatShortDateTime(e.deadline)}
                      </span>
                      {left && (
                        <span className="ee-muted" style={{ fontSize: 12 }}>
                          {left}
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {e.duration ? formatDuration(e.duration) : 'Cheklanmagan'}
                    </td>
                    <td className="ee-num">
                      {lowTotal ? (
                        <Tooltip
                          title={`O'tish bali jami balldan (${e.total_points}) katta — hech kim o'ta olmaydi`}
                        >
                          <span style={{ textDecoration: 'underline dashed', cursor: 'help' }}>
                            {e.passing_score} ✕
                          </span>
                        </Tooltip>
                      ) : (
                        e.passing_score
                      )}
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <Link
                        to={`/teacher/results?exam=${e.id}`}
                        className="ee-num"
                        style={{ color: 'inherit' }}
                        title="Natijalarni ko'rish"
                      >
                        {done} <span className="ee-muted">/ {size}</span>
                      </Link>
                      {size > 0 && (
                        <Progress
                          percent={Math.min(100, Math.round((done / size) * 100))}
                          showInfo={false}
                          size="small"
                          style={{ margin: 0 }}
                        />
                      )}
                    </td>
                    <td>
                      <Tag variant={STATUS[s].variant}>{STATUS[s].label}</Tag>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'results', icon: <BarChartOutlined />, label: 'Natijalar' },
                            {
                              key: 'questions',
                              icon: <UnorderedListOutlined />,
                              label: 'Savollar',
                            },
                            { key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash' },
                            { type: 'divider' },
                            {
                              key: 'delete',
                              icon: <DeleteOutlined />,
                              label: "O'chirish",
                              danger: true,
                            },
                          ],
                          onClick: ({ key }) => {
                            if (key === 'results') navigate(`/teacher/results?exam=${e.id}`)
                            else if (key === 'questions')
                              navigate(`/teacher/exams/${e.id}/questions`)
                            else if (key === 'edit') drawer.openEdit(e)
                            else confirmDelete(e)
                          },
                        }}
                      >
                        <Button
                          type="text"
                          icon={<MoreOutlined />}
                          aria-label="Boshqa harakatlar"
                        />
                      </Dropdown>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ExamForm
        open={drawer.open}
        exam={drawer.record}
        groups={groupList}
        defaultGroup={groupId || undefined}
        onClose={drawer.close}
        onCreated={(exam) => navigate(`/teacher/exams/${exam.id}/questions`)}
      />
    </>
  )
}

interface ExamFormValues {
  group: number
  name: string
  description?: string
  deadline: Dayjs
  /** Daqiqada; bo'sh — vaqt cheklanmagan */
  minutes?: number | null
  passing_score: number
  is_active: boolean
}

function ExamForm({
  open,
  exam,
  groups,
  defaultGroup,
  onClose,
  onCreated,
}: {
  open: boolean
  exam: TeacherExam | null
  groups: { id: number; name: string; status?: string }[]
  defaultGroup?: number
  onClose: () => void
  onCreated: (exam: TeacherExam) => void
}) {
  const [form] = Form.useForm<ExamFormValues>()
  const save = useSaveExam()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  const passing = Form.useWatch('passing_score', form)
  const minutes = Form.useWatch('minutes', form)

  const initialValues = useMemo<Partial<ExamFormValues>>(
    () =>
      exam
        ? {
            group: exam.group,
            name: exam.name,
            description: exam.description ?? '',
            deadline: dayjs(exam.deadline),
            minutes: exam.duration ? Math.round(durationToSeconds(exam.duration) / 60) : null,
            passing_score: exam.passing_score ?? 60,
            is_active: exam.is_active ?? true,
          }
        : {
            group: defaultGroup,
            // Standart: bir hafta muddat, 1 soat vaqt
            deadline: dayjs().add(7, 'day').hour(18).minute(0).second(0),
            minutes: 60,
            passing_score: 60,
            is_active: true,
          },
    [exam, defaultGroup],
  )

  const onSubmit = (v: ExamFormValues) => {
    save.mutate(
      {
        id: exam?.id,
        data: {
          group: v.group,
          name: v.name.trim(),
          description: v.description?.trim() ?? '',
          deadline: v.deadline.toISOString(),
          duration: v.minutes ? minutesToHms(v.minutes) : null,
          passing_score: v.passing_score,
          is_active: v.is_active,
        },
      },
      {
        onSuccess: (saved) => {
          message.success(
            exam ? 'Imtihon saqlandi' : "Imtihon yaratildi — endi savollarni qo'shing",
          )
          onClose()
          if (!exam) onCreated(saved)
        },
        onError: (error) => handleError(error, form),
      },
    )
  }

  const total = exam?.questions_count ? exam.total_points : null

  return (
    <FormDrawer<ExamFormValues>
      open={open}
      title={exam ? 'Imtihonni tahrirlash' : 'Yangi imtihon'}
      form={form}
      initialValues={initialValues}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitText={exam ? 'Saqlash' : "Yaratish va savollar qo'shish"}
      width={520}
    >
      <Form.Item
        name="group"
        label="Guruh"
        rules={[{ required: true, message: 'Guruhni tanlang' }]}
      >
        <Select
          placeholder="Guruhni tanlang"
          options={groups.map((g) => ({
            value: g.id,
            label: g.name,
            // Backend tugallangan / bekor qilingan guruhga imtihon qo'shishni taqiqlaydi
            disabled: g.status === 'completed' || g.status === 'cancelled',
          }))}
        />
      </Form.Item>
      <Form.Item
        name="name"
        label="Imtihon nomi"
        rules={[{ required: true, whitespace: true, message: 'Nomini kiriting' }, { max: 64 }]}
      >
        <Input placeholder="Final Exam — IELTS Listening" maxLength={64} showCount />
      </Form.Item>
      <Form.Item name="description" label="Tavsif">
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="Talabalar uchun yo'riqnoma"
        />
      </Form.Item>
      <Form.Item
        name="deadline"
        label="Muddat (shu vaqtgacha topshirish mumkin)"
        rules={[
          { required: true, message: 'Muddatni kiriting' },
          {
            validator: (_, v?: Dayjs) =>
              !v || exam || v.isAfter(dayjs())
                ? Promise.resolve()
                : Promise.reject(new Error("Muddat o'tgan vaqt bo'lmasin")),
          },
        ]}
      >
        <DatePicker
          showTime={{ format: 'HH:mm' }}
          format="DD.MM.YYYY HH:mm"
          style={{ width: '100%' }}
          disabledDate={(d) => !exam && d.isBefore(dayjs(), 'day')}
        />
      </Form.Item>
      <Form.Item label="Imtihon vaqti">
        <Form.Item name="minutes" noStyle>
          <InputNumber
            min={1}
            max={24 * 60}
            precision={0}
            style={{ width: '100%' }}
            suffix="daqiqa"
            placeholder="Cheklanmagan"
          />
        </Form.Item>
        <Flex gap={6} wrap style={{ marginTop: 8 }}>
          {DURATION_PRESETS.map(([m, label]) => (
            <button
              key={m}
              type="button"
              className={`ee-pill${minutes === m ? ' is-on' : ''}`}
              style={{ minHeight: 30, padding: '0 12px', fontSize: 13 }}
              onClick={() => form.setFieldValue('minutes', m)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={`ee-pill${!minutes ? ' is-on' : ''}`}
            style={{ minHeight: 30, padding: '0 12px', fontSize: 13 }}
            onClick={() => form.setFieldValue('minutes', null)}
          >
            Cheklanmagan
          </button>
        </Flex>
      </Form.Item>
      <Form.Item
        name="passing_score"
        label="O'tish bali"
        extra={
          total !== null
            ? `Jami ball: ${total}. Shuncha yoki ko'proq ball olgan talaba o'tadi`
            : "Shuncha yoki ko'proq ball olgan talaba o'tadi. Savollar ballari yig'indisi bilan solishtiring"
        }
        rules={[{ required: true, message: "O'tish balini kiriting" }]}
      >
        <InputNumber min={1} precision={0} style={{ width: '100%' }} />
      </Form.Item>
      {total !== null && (passing ?? 0) > total && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`O'tish bali (${passing}) savollar ballari yig'indisidan (${total}) katta — hech kim o'ta olmaydi.`}
        />
      )}
      <Form.Item name="is_active" valuePropName="checked" style={{ marginBottom: 0 }}>
        <Checkbox>Imtihon faol (talabalarga ko'rinadi)</Checkbox>
      </Form.Item>
    </FormDrawer>
  )
}
