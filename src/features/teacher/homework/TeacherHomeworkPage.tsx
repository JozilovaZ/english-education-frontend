import { PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Skeleton,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'

import type { Homework, HomeworkSubmissionDetail, Lesson } from '@/shared/api/generated/model'
import { formatShortDateTime, formatTimeLeft } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { FileDrop, FormDrawer, PageHeader, QueryError, Tag, useFormDrawer } from '@/shared/ui'

import {
  useAllSubmissions,
  useCreateHomework,
  useGradeSubmission,
  useGroupStudents,
  useSubmissions,
  useTeacherGroups,
  useTeacherHomework,
  useTeacherLessons,
} from '../api'

/** Backend resurs cheklovi (apps/homework/validators.py) */
const ACCEPT = ['.pdf', '.doc', '.docx']
const MAX_MB = 5

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const lessonLabel = (l: Lesson) => `${l.group_name} · ${l.lesson_number}-dars — ${l.title}`

/** O'qituvchi uy vazifalari: chapda vazifalar ro'yxati, o'ngda topshirilgan ishlar va baholash */
export function TeacherHomeworkPage() {
  const lessons = useTeacherLessons()
  const homework = useTeacherHomework()
  const allSubs = useAllSubmissions()
  const groups = useTeacherGroups()
  const [params, setParams] = useUrlState()
  const drawer = useFormDrawer<Homework>({ openOnNew: true })

  if (lessons.isPending || homework.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (lessons.isError) return <QueryError error={lessons.error} onRetry={() => lessons.refetch()} />
  if (homework.isError)
    return <QueryError error={homework.error} onRetry={() => homework.refetch()} />

  const lessonById = new Map(lessons.data.map((l) => [l.id, l]))
  const groupSize = new Map((groups.data ?? []).map((g) => [g.id, g.active_students_count ?? 0]))

  // Har bir vazifa bo'yicha: nechta topshirildi va nechtasi hali baholanmagan
  const subStats = new Map<number, { done: number; fresh: number }>()
  for (const s of allSubs.data ?? []) {
    const st = subStats.get(s.homework) ?? { done: 0, fresh: 0 }
    st.done++
    if (s.score === null) st.fresh++
    subStats.set(s.homework, st)
  }
  const fresh = (h: Homework) => subStats.get(h.id)?.fresh ?? 0

  // Backend hozircha barcha vazifalarni qaytaradi (BACKEND_ISSUES #3) — faqat o'z darslarimniki.
  // Tekshirilmagan ishi borlari birinchi, keyin muddati yangisi
  const mine = homework.data
    .filter((h) => lessonById.has(h.lesson))
    .sort(
      (a, b) =>
        Number(fresh(b) > 0) - Number(fresh(a) > 0) || dayjs(b.deadline).diff(dayjs(a.deadline)),
    )
  const current = mine.find((h) => h.id === Number(params.get('hw'))) ?? mine[0]
  const freshTotal = mine.reduce((n, h) => n + fresh(h), 0)

  return (
    <>
      <PageHeader
        eyebrow={`${mine.length} ta vazifa${freshTotal ? ` · ${freshTotal} ta ish tekshirilmagan` : ''}`}
        title="Uy vazifalari"
        subtitle="Vazifani tanlang — topshirilgan ishlarni ko'rib baholaysiz"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={drawer.openCreate}
          >
            Vazifa berish
          </Button>
        }
      />

      {!current ? (
        <div className="ee-panel">
          <Empty description="Hali uy vazifasi berilmagan">
            <Button type="primary" icon={<PlusOutlined />} onClick={drawer.openCreate}>
              Birinchi vazifani berish
            </Button>
          </Empty>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <aside
            className="ee-panel"
            style={{
              flex: '1 1 300px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <h2 className="ee-heading" style={{ marginBottom: 4 }}>
              Vazifalar
            </h2>
            {mine.map((h) => {
              const l = lessonById.get(h.lesson)
              const st = subStats.get(h.id) ?? { done: 0, fresh: 0 }
              const size = l ? groupSize.get(l.group) : undefined
              const left = formatTimeLeft(h.deadline)
              return (
                <button
                  key={h.id}
                  type="button"
                  aria-current={h.id === current.id ? 'true' : undefined}
                  className={`ee-list-item${h.id === current.id ? ' is-active' : ''}`}
                  onClick={() => setParams({ hw: h.id, s: null })}
                >
                  <Flex
                    justify="space-between"
                    align="flex-start"
                    gap={8}
                    style={{ width: '100%' }}
                  >
                    <strong style={{ fontSize: 15, minWidth: 0, overflowWrap: 'anywhere' }}>
                      {h.title}
                    </strong>
                    {st.fresh > 0 && <Tag variant="prog">{st.fresh} yangi</Tag>}
                  </Flex>
                  {l && (
                    <span className="ee-muted" style={{ fontSize: 12 }}>
                      {l.group_name} · {l.lesson_number}-dars
                    </span>
                  )}
                  <Flex justify="space-between" gap={8} style={{ width: '100%', fontSize: 12 }}>
                    <span>
                      <span className="ee-num">{formatShortDateTime(h.deadline)}</span>
                      <span className="ee-muted"> · {left ?? "muddati o'tgan"}</span>
                    </span>
                    <span className="ee-num" title="Topshirganlar">
                      {st.done}
                      {size !== undefined && <span className="ee-muted"> / {size}</span>}
                    </span>
                  </Flex>
                </button>
              )
            })}
          </aside>

          <section
            style={{
              flex: '999 1 560px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <Submissions
              key={current.id}
              homework={current}
              lesson={lessonById.get(current.lesson)}
              selectedSubmission={Number(params.get('s')) || undefined}
              onSubmission={(id) => setParams({ s: id })}
            />
          </section>
        </div>
      )}

      <CreateHomeworkForm
        open={drawer.open}
        onClose={drawer.close}
        lessons={lessons.data}
        onCreated={(hw) => setParams({ hw: hw.id, s: null })}
      />
    </>
  )
}

function Submissions({
  homework,
  lesson,
  selectedSubmission,
  onSubmission,
}: {
  homework: Homework
  lesson?: Lesson
  selectedSubmission?: number
  onSubmission: (id: number) => void
}) {
  const subs = useSubmissions(homework.id)
  const students = useGroupStudents(lesson?.group)
  const maxScore = homework.max_score ?? 100

  const list = [...(subs.data ?? [])].sort(
    // Baholanmaganlar birinchi, keyin topshirilgan vaqt bo'yicha
    (a, b) =>
      Number(a.score !== null) - Number(b.score !== null) ||
      dayjs(b.submitted_at).diff(dayjs(a.submitted_at)),
  )
  const current = list.find((s) => s.id === selectedSubmission) ?? list[0]
  const submittedIds = new Set(list.map((s) => s.student))
  const missing = (students.data ?? []).filter((s) => !submittedIds.has(s.student_id))

  return (
    <>
      <div className="ee-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="ee-eyebrow">
          {lesson && `${lesson.group_name} · ${lesson.lesson_number}-dars · `}
          Muddat {formatShortDateTime(homework.deadline)} · {maxScore} ball
        </span>
        <h2 className="ee-heading" style={{ fontSize: 22 }}>
          {homework.title}
        </h2>
        {homework.description && (
          <p className="ee-muted" style={{ margin: 0, whiteSpace: 'pre-line' }}>
            {homework.description}
          </p>
        )}
        {students.data && (
          <Flex vertical gap={6}>
            <span style={{ fontSize: 14 }}>
              <strong>
                {list.length} / {students.data.length}
              </strong>{' '}
              <span className="ee-muted">talaba topshirdi</span>
            </span>
            {missing.length > 0 && (
              <Flex wrap gap={4} align="center">
                <span className="ee-muted" style={{ fontSize: 12, marginRight: 4 }}>
                  Topshirmaganlar:
                </span>
                {missing.map((s) => (
                  <Tag key={s.student_id} variant="neu">
                    {s.student_name}
                  </Tag>
                ))}
              </Flex>
            )}
          </Flex>
        )}
      </div>

      {subs.isPending ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : subs.isError ? (
        <QueryError error={subs.error} onRetry={() => subs.refetch()} />
      ) : list.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Hali hech kim topshirmagan" />
        </div>
      ) : (
        <>
          <Flex vertical gap={8}>
            {list.map((s) => {
              const late = s.submitted_at && dayjs(s.submitted_at).isAfter(dayjs(homework.deadline))
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={s.id === current?.id ? 'true' : undefined}
                  className={`ee-list-item ee-list-item--row${s.id === current?.id ? ' is-active' : ''}`}
                  onClick={() => onSubmission(s.id)}
                >
                  <span className="ee-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                    {initials(s.student_name ?? '?')}
                  </span>
                  <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 15 }}>{s.student_name}</strong>
                    <span className="ee-mono" style={{ fontSize: 12, opacity: 0.8 }}>
                      {formatShortDateTime(s.submitted_at)}
                    </span>
                  </span>
                  {late && <Tag variant="warn">Kechikkan</Tag>}
                  {s.score === null ? (
                    <Tag variant="prog">Yangi</Tag>
                  ) : (
                    // Uy vazifasida o'tish bali yo'q — dizayndagidek 60% chegarasi bilan ajratiladi
                    <Tag variant={s.score >= maxScore * 0.6 ? 'pos' : 'neg'}>{s.score} ball</Tag>
                  )}
                </button>
              )
            })}
          </Flex>
          {current && <GradeForm key={current.id} submission={current} maxScore={maxScore} />}
        </>
      )}
    </>
  )
}

function GradeForm({
  submission,
  maxScore,
}: {
  submission: HomeworkSubmissionDetail
  maxScore: number
}) {
  const [form] = Form.useForm<{ score: number; teacher_comment?: string }>()
  const grade = useGradeSubmission()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  const file = submission.file

  return (
    <div
      className="ee-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        border: '2px solid var(--ee-accent)',
      }}
    >
      <Flex justify="space-between" align="center" gap={12} wrap>
        <h2 className="ee-heading">{submission.student_name}</h2>
        <span className="ee-muted ee-mono" style={{ fontSize: 13 }}>
          Topshirildi {formatShortDateTime(submission.submitted_at)}
        </span>
      </Flex>
      <div
        className="ee-sunken"
        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <span className="ee-eyebrow">Javob</span>
        {submission.answer ? (
          <p style={{ margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
            {submission.answer}
          </p>
        ) : (
          <span className="ee-muted">Matn yozilmagan</span>
        )}
        {file && (
          <a
            href={file}
            target="_blank"
            rel="noreferrer"
            className="ee-resource"
            style={{ background: 'var(--ee-bg)' }}
          >
            <strong>Biriktirilgan fayl</strong>
            <span className="ee-muted" style={{ marginLeft: 'auto' }}>
              {file.split('.').pop()?.toUpperCase()}
            </span>
          </a>
        )}
      </div>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          score: submission.score ?? undefined,
          teacher_comment: submission.teacher_comment ?? '',
        }}
        onFinish={(v) =>
          grade.mutate(
            {
              id: submission.id,
              homeworkId: submission.homework,
              score: v.score,
              teacher_comment: v.teacher_comment?.trim() ?? '',
            },
            {
              onSuccess: () => message.success('Baholandi — ota-onaga xabar yuboriladi'),
              onError: (e) => handleError(e, form),
            },
          )
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', gap: 12 }}>
          <Form.Item
            name="score"
            label="Ball"
            extra={`0–${maxScore}`}
            rules={[{ required: true, message: 'Ball kiriting' }]}
          >
            <InputNumber min={0} max={maxScore} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="teacher_comment" label="Izoh">
            <Input placeholder="Masalan: A'lo darajada bajarilgan!" />
          </Form.Item>
        </div>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <span className="ee-muted" style={{ fontSize: 13 }}>
            Baholangach ota-onaga Telegram orqali xabar boradi.
          </span>
          <Button type="primary" htmlType="submit" style={{ height: 44 }} loading={grade.isPending}>
            {submission.score === null ? 'Baholash' : 'Bahoni yangilash'}
          </Button>
        </Flex>
      </Form>
    </div>
  )
}

interface CreateValues {
  lesson: number
  title: string
  description?: string
  deadline: Dayjs
  max_score: number
  url?: string
}

function CreateHomeworkForm({
  open,
  onClose,
  lessons,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  lessons: Lesson[]
  onCreated: (hw: Homework) => void
}) {
  const [form] = Form.useForm<CreateValues>()
  const [file, setFile] = useState<File | null>(null)
  const create = useCreateHomework()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  // Eng oxirgi dars birinchi — odatda vazifa shu darsga beriladi
  const sorted = useMemo(
    () =>
      [...lessons].sort(
        (a, b) => dayjs(b.date).diff(dayjs(a.date)) || b.lesson_number - a.lesson_number,
      ),
    [lessons],
  )
  const initialValues = useMemo<Partial<CreateValues>>(
    () => ({
      lesson: sorted.find((l) => !dayjs(l.date).isAfter(dayjs(), 'day'))?.id,
      max_score: 100,
      // Standart muddat: 2 kundan keyin soat 18:00
      deadline: dayjs().add(2, 'day').hour(18).minute(0).second(0),
    }),
    [sorted],
  )

  const close = () => {
    setFile(null)
    onClose()
  }

  const onSubmit = (v: CreateValues) =>
    create.mutate(
      {
        lesson: v.lesson,
        title: v.title.trim(),
        description: v.description?.trim() ?? '',
        deadline: v.deadline.toISOString(),
        max_score: v.max_score,
        file,
        url: v.url?.trim() ?? '',
      },
      {
        onSuccess: (hw) => {
          message.success('Uy vazifasi berildi')
          close()
          onCreated(hw)
        },
        onError: (e) => handleError(e, form),
      },
    )

  return (
    <FormDrawer<CreateValues>
      open={open}
      title="Yangi uy vazifasi"
      form={form}
      initialValues={initialValues}
      onClose={close}
      onSubmit={onSubmit}
      submitting={create.isPending}
      submitText="Vazifani berish"
      width={520}
    >
      <Form.Item name="lesson" label="Dars" rules={[{ required: true, message: 'Darsni tanlang' }]}>
        <Select
          placeholder={lessons.length ? 'Darsni tanlang' : "Darslar yo'q"}
          options={sorted.map((l) => ({ value: l.id, label: lessonLabel(l) }))}
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      <Form.Item
        name="title"
        label="Sarlavha"
        rules={[{ required: true, whitespace: true, message: 'Sarlavha kiriting' }, { max: 200 }]}
      >
        <Input maxLength={200} placeholder="Unit 3 — Present Perfect Exercises" />
      </Form.Item>
      <Form.Item name="description" label="Tavsif">
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="25-betdagi 1- va 2-mashqlar…"
        />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Form.Item
          name="deadline"
          label="Muddat"
          rules={[
            { required: true, message: 'Muddatni kiriting' },
            {
              validator: (_, v?: Dayjs) =>
                !v || v.isAfter(dayjs())
                  ? Promise.resolve()
                  : Promise.reject(new Error("Muddat o'tgan vaqt bo'lmasin")),
            },
          ]}
        >
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="DD.MM.YYYY HH:mm"
            style={{ width: '100%' }}
            disabledDate={(d) => d.isBefore(dayjs(), 'day')}
          />
        </Form.Item>
        <Form.Item
          name="max_score"
          label="Maksimal ball"
          rules={[{ required: true, message: 'Ball kiriting' }]}
        >
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </div>
      <div className="ee-field" style={{ marginBottom: 12 }}>
        <span className="ee-field__label">Fayl (ixtiyoriy)</span>
        <FileDrop
          value={file}
          onChange={setFile}
          onInvalid={(t) => message.error(t)}
          accept={ACCEPT}
          maxMb={MAX_MB}
          title="Fayl yuklash"
          hint="PDF, DOC, DOCX"
          disabled={create.isPending}
        />
      </div>
      <Form.Item
        name="url"
        label="Yoki havola"
        rules={[{ type: 'url', message: "To'liq havola kiriting: https://…" }]}
        style={{ marginBottom: 0 }}
      >
        <Input placeholder="https://" inputMode="url" />
      </Form.Item>
    </FormDrawer>
  )
}
