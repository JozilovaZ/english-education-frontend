import { CheckOutlined } from '@ant-design/icons'
import { Alert, App, Button, Empty, Flex, Input, Segmented, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import type { Attendance, GroupStudent, Lesson } from '@/shared/api/generated/model'
import { formatTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { QueryError, STATUS_MAPS, Tag } from '@/shared/ui'

import {
  useAllAttendance,
  useBulkAttendance,
  useGroupStudents,
  useLessonAttendance,
  useTeacherLessons,
} from '../api'
import { byDateDesc, canMarkAttendance, initials, lessonState } from '../lessons/lessonMeta'
import {
  changedItems,
  initialDraft,
  markRestPresent,
  NOTIFIES,
  STATUSES,
  type Draft,
  type Status,
} from './attendanceMeta'

/** Davomat: chapda darslar, o'ngda guruh talabalari ro'yxati */
export function TeacherAttendancePage() {
  const lessons = useTeacherLessons()
  const attendance = useAllAttendance()
  const [params, setParams] = useUrlState()
  const [dirty, setDirty] = useState(false)
  const { modal } = App.useApp()

  // Saqlanmagan belgilar bilan sahifadan chiqishda brauzer so'raydi
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (lessons.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (lessons.isError) return <QueryError error={lessons.error} onRetry={() => lessons.refetch()} />

  // Faqat boshlangan yoki o'tgan darslar, oxirgisidan boshlab
  const list = lessons.data.filter(canMarkAttendance).sort(byDateDesc)
  // Davomat qilingan darslar (kamida bitta yozuv bor)
  const marked = new Set((attendance.data ?? []).map((a) => a.lesson))
  const pending = list.filter((l) => !marked.has(l.id)).length
  // Tanlanmagan bo'lsa — davomati qilinmagan eng oxirgi dars
  const current =
    list.find((l) => l.id === Number(params.get('lesson'))) ??
    (attendance.data ? list.find((l) => !marked.has(l.id)) : undefined) ??
    list[0]

  const select = (id: number) => {
    if (id === current?.id) return
    if (!dirty) {
      setParams({ lesson: id })
      return
    }
    modal.confirm({
      title: 'Davomat saqlanmagan',
      content: "Boshqa darsga o'tsangiz belgilaganlaringiz yo'qoladi.",
      okText: "O'tish",
      okButtonProps: { danger: true },
      cancelText: 'Qolish',
      onOk: () => {
        setDirty(false)
        setParams({ lesson: id })
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      <aside
        className="ee-panel"
        style={{
          flex: '1 1 300px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <Flex justify="space-between" align="center" gap={8}>
          <h2 className="ee-heading">Darslar</h2>
          {attendance.data && pending > 0 && <Tag variant="warn">{pending} ta qilinmagan</Tag>}
        </Flex>
        {list.length === 0 ? (
          <Empty description="Hali boshlangan dars yo'q" />
        ) : (
          <>
            {/* Ko'p darslarda tez topish uchun qidiruv */}
            {list.length > 8 && (
              <Select
                aria-label="Darsni topish"
                placeholder="Darsni topish"
                showSearch
                optionFilterProp="label"
                value={null}
                onChange={(id: number) => select(id)}
                options={list.map((l) => ({
                  value: l.id,
                  label: `${l.group_name} · ${l.lesson_number}-dars — ${l.title}`,
                }))}
              />
            )}
            <Flex vertical gap={8} style={{ maxHeight: 560, overflowY: 'auto' }}>
              {list.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-current={l.id === current?.id ? 'true' : undefined}
                  className={`ee-list-item${l.id === current?.id ? ' is-active' : ''}`}
                  onClick={() => select(l.id)}
                >
                  <Flex justify="space-between" gap={8} style={{ width: '100%' }}>
                    <strong style={{ fontSize: 15 }}>
                      {l.lesson_number}-dars · {l.title}
                    </strong>
                    {lessonState(l) === 'now' && <Tag variant="pos">Hozir</Tag>}
                  </Flex>
                  <Flex justify="space-between" gap={8} style={{ width: '100%' }}>
                    <span className="ee-muted ee-mono" style={{ fontSize: 12 }}>
                      {l.group_name} · {dayjs(l.date).format('DD.MM')} · {formatTime(l.start_time)}
                    </span>
                    {attendance.data &&
                      (marked.has(l.id) ? (
                        <span style={{ fontSize: 12 }} className="ee-muted">
                          ✓ Qilingan
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Qilinmagan</span>
                      ))}
                  </Flex>
                </button>
              ))}
            </Flex>
          </>
        )}
      </aside>

      <section
        style={{
          flex: '999 1 600px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {current ? (
          <Sheet
            key={current.id}
            lesson={current}
            onDirtyChange={setDirty}
            // Saqlangach ro'yxat yangilanadi — tanlangan dars o'zgarib ketmasin
            onSaved={() => setParams({ lesson: current.id })}
          />
        ) : (
          <>
            <h1 className="ee-title">Davomat</h1>
            <div className="ee-panel">
              <Empty description="Davomat dars boshlangandan keyin qilinadi" />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Sheet({
  lesson,
  onDirtyChange,
  onSaved,
}: {
  lesson: Lesson
  onDirtyChange: (dirty: boolean) => void
  onSaved: () => void
}) {
  const students = useGroupStudents(lesson.group)
  const records = useLessonAttendance(lesson.id)

  return (
    <>
      <Flex vertical gap={6}>
        <span className="ee-eyebrow">
          {lesson.group_name} · {dayjs(lesson.date).format('DD.MM.YYYY')} ·{' '}
          {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
        </span>
        <h1 className="ee-title">
          {lesson.lesson_number}-dars · {lesson.title}
        </h1>
      </Flex>
      {students.isPending || records.isPending ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : students.isError ? (
        <QueryError error={students.error} onRetry={() => students.refetch()} />
      ) : records.isError ? (
        <QueryError error={records.error} onRetry={() => records.refetch()} />
      ) : students.data.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Guruhda faol talaba yo'q" />
        </div>
      ) : (
        <Roster
          lesson={lesson}
          students={students.data}
          records={records.data}
          onDirtyChange={onDirtyChange}
          onSaved={onSaved}
        />
      )}
    </>
  )
}

function Roster({
  lesson,
  students,
  records,
  onDirtyChange,
  onSaved,
}: {
  lesson: Lesson
  students: GroupStudent[]
  records: Attendance[]
  onDirtyChange: (dirty: boolean) => void
  onSaved: () => void
}) {
  const bulk = useBulkAttendance()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  const sorted = useMemo(
    () =>
      [...students].sort((a, b) =>
        (a.student_name ?? a.student_username).localeCompare(b.student_name ?? b.student_username),
      ),
    [students],
  )
  const [draft, setDraft] = useState<Draft>(() => initialDraft(students, records))

  // Faqat o'zgargan qatorlar yuboriladi: backend har saqlashda ota-onaga qayta xabar yuboradi
  const changed = changedItems(sorted, draft, records)
  const unmarked = sorted.filter((s) => !draft[s.student_id]?.status)
  const dirty = changed.length > 0

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const counts = Object.fromEntries(
    STATUSES.map((st) => [st, sorted.filter((s) => draft[s.student_id]?.status === st).length]),
  ) as Record<Status, number>

  const patch = (id: number, value: Partial<Draft[number]>) =>
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...value } }))

  const allPresent = () => setDraft(markRestPresent)

  const onSave = () => {
    const attendances = changed
    const notified = attendances.filter((a) => NOTIFIES.includes(a.status)).length
    bulk.mutate(
      { lesson: lesson.id, attendances },
      {
        onSuccess: () => {
          onSaved()
          message.success(
            notified
              ? `Davomat saqlandi — ${notified} ta talabaning ota-onasiga Telegram xabar yuboriladi`
              : 'Davomat saqlandi',
          )
        },
        onError: (e) => handleError(e),
      },
    )
  }

  return (
    <>
      {records.length === 0 && (
        <Alert
          type="warning"
          showIcon
          title="Bu dars uchun davomat hali qilinmagan"
          description="Kelmaganlarni belgilang, so'ng «Qolganlari keldi» tugmasini bosing va saqlang."
        />
      )}

      <Flex justify="space-between" align="center" gap={12} wrap>
        <Flex gap={8} wrap>
          {STATUSES.map((st) => (
            <Tag key={st} variant={STATUS_MAPS.attendance[st].variant}>
              {STATUS_MAPS.attendance[st].label}: {counts[st]}
            </Tag>
          ))}
          {unmarked.length > 0 && <Tag variant="warn">Belgilanmagan: {unmarked.length}</Tag>}
        </Flex>
        <Button
          icon={<CheckOutlined />}
          onClick={allPresent}
          disabled={unmarked.length === 0 || bulk.isPending}
        >
          Qolganlari keldi
        </Button>
      </Flex>

      {/* Jadval emas, qatorlar: telefonda holat tugmalari va izoh pastga tushadi */}
      <div className="ee-panel" style={{ padding: 0 }}>
        {sorted.map((s) => {
          const d = draft[s.student_id]
          const name = s.student_name || s.student_username
          return (
            <div key={s.student_id} className="ee-att-row">
              <Flex align="center" gap={10} className="ee-att-row__name">
                <span className="ee-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                  {initials(name)}
                </span>
                <strong>{name}</strong>
              </Flex>
              <Segmented<Status>
                aria-label={`${name} — holati`}
                className="ee-att-row__status"
                value={d?.status ?? (null as unknown as Status)}
                onChange={(status) => patch(s.student_id, { status })}
                disabled={bulk.isPending}
                options={STATUSES.map((st) => ({
                  value: st,
                  label: STATUS_MAPS.attendance[st].label,
                }))}
              />
              <Input
                aria-label={`${name} — izoh`}
                className="ee-att-row__note"
                value={d?.note}
                onChange={(e) => patch(s.student_id, { note: e.target.value })}
                placeholder={d?.status === 'excused' ? 'Sababi' : 'Izoh'}
                disabled={bulk.isPending}
                maxLength={255}
              />
            </div>
          )
        })}
      </div>

      <Flex justify="space-between" align="center" gap={12} wrap>
        <span className="ee-muted" style={{ fontSize: 13 }}>
          Kelmagan va kechikkanlarning ota-onasiga Telegram orqali xabar boradi.
        </span>
        <Button
          type="primary"
          className={dirty ? 'ee-btn-accent' : undefined}
          style={{ height: 44 }}
          onClick={onSave}
          loading={bulk.isPending}
          disabled={!dirty}
        >
          {dirty ? `Saqlash (${changed.length})` : records.length ? '✓ Saqlangan' : 'Saqlash'}
        </Button>
      </Flex>
    </>
  )
}
