import { Button, Flex, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router'

import { useAuthStore } from '@/features/auth/store'
import type { Lesson } from '@/shared/api/generated/model'
import { formatShortDateTime, formatTime } from '@/shared/lib/format'
import { FeaturedBlock, QueryError, StatRow, StatTile, Tag } from '@/shared/ui'

import {
  useAllAttendance,
  useAllSubmissions,
  useTeacherExams,
  useTeacherGroups,
  useTeacherHomework,
  useTeacherLessons,
} from './api'
import { canMarkAttendance, initials, lessonState } from './lessons/lessonMeta'

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
]
/** "Payshanba, 9-oktabr" */
const longDate = (d: dayjs.Dayjs) => `${WEEKDAYS[d.day()]}, ${d.date()}-${MONTHS[d.month()]}`

/** Davomati qilinmagan darslar shu muddat ichida eslatiladi */
const ATTENDANCE_LOOKBACK_DAYS = 14

const byStart = (a: Lesson, b: Lesson) =>
  a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)

/** O'qituvchi bosh sahifasi: bugungi darslar, tekshirilmagan ishlar, davomat eslatmalari */
export function TeacherHomePage() {
  const user = useAuthStore((s) => s.user)
  const groups = useTeacherGroups()
  const lessons = useTeacherLessons()
  const submissions = useAllSubmissions()
  const attendance = useAllAttendance()
  const homework = useTeacherHomework()
  const exams = useTeacherExams()

  if (groups.isPending || lessons.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (groups.isError) return <QueryError error={groups.error} onRetry={() => groups.refetch()} />
  if (lessons.isError) return <QueryError error={lessons.error} onRetry={() => lessons.refetch()} />

  const now = dayjs()
  const studentsByGroup = new Map(groups.data.map((g) => [g.id, g.active_students_count ?? 0]))
  const students = groups.data.reduce((sum, g) => sum + (g.active_students_count ?? 0), 0)

  const today = lessons.data.filter((l) => dayjs(l.date).isSame(now, 'day')).sort(byStart)
  // Asosiy blok: hozirgi yoki bugungi keyingi dars; bugun bo'lmasa — eng yaqin kelgusi dars
  const featured =
    today.find((l) => lessonState(l, now) !== 'done') ??
    lessons.data.filter((l) => lessonState(l, now) === 'upcoming').sort(byStart)[0]

  const marked = new Set((attendance.data ?? []).map((a) => a.lesson))
  const unmarked = attendance.data
    ? lessons.data
        .filter(
          (l) =>
            canMarkAttendance(l) &&
            !marked.has(l.id) &&
            !dayjs(l.date).isBefore(now.subtract(ATTENDANCE_LOOKBACK_DAYS, 'day'), 'day'),
        )
        .sort((a, b) => byStart(b, a))
    : []

  const toGrade = (submissions.data ?? [])
    .filter((s) => s.score === null || s.score === undefined)
    .sort((a, b) => dayjs(a.submitted_at).diff(dayjs(b.submitted_at)))

  // Backend uy vazifalarini filtrlamaydi (BACKEND_ISSUES #3) — faqat o'z darslarimniki
  const myLessons = new Set(lessons.data.map((l) => l.id))
  const deadlines = [
    ...(homework.data ?? [])
      .filter((h) => myLessons.has(h.lesson) && dayjs(h.deadline).isAfter(now))
      .map((h) => ({
        key: `h${h.id}`,
        title: h.title,
        meta: 'Uy vazifasi',
        deadline: h.deadline,
        to: `/teacher/homework?hw=${h.id}`,
      })),
    ...(exams.data ?? [])
      .filter((e) => e.is_active && dayjs(e.deadline).isAfter(now))
      .map((e) => ({
        key: `e${e.id}`,
        title: e.name,
        meta: `Imtihon · ${e.group_name}`,
        deadline: e.deadline,
        to: `/teacher/results?exam=${e.id}`,
      })),
  ]
    .sort((a, b) => dayjs(a.deadline).diff(dayjs(b.deadline)))
    .slice(0, 5)

  const summary = [
    today.length ? `bugun ${today.length} ta dars` : null,
    toGrade.length ? `${toGrade.length} ta tekshirilmagan uy vazifasi` : null,
  ].filter(Boolean)

  return (
    <Flex vertical gap={32}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="ee-eyebrow">{longDate(now)}</span>
        <h1 className="ee-display">Salom, {user?.firstName || user?.username}</h1>
        <p className="ee-muted" style={{ margin: 0, fontSize: 16 }}>
          {summary.length ? `Sizda ${summary.join(' va ')} bor.` : "Bugun dars yo'q."}
        </p>
      </section>

      <StatRow>
        <StatTile
          label="Bugungi darslar"
          value={today.length}
          suffix={
            today.length
              ? `${today.filter((l) => lessonState(l, now) === 'done').length} o'tdi`
              : undefined
          }
          tone="accent"
          to="/teacher/lessons"
        />
        <StatTile
          label="Tekshirish kerak"
          value={submissions.data ? toGrade.length : '…'}
          suffix="uy vazifasi"
          tone={toGrade.length > 0 ? 'ink' : 'plain'}
          to="/teacher/homework"
        />
        <StatTile
          label="Davomatsiz darslar"
          value={attendance.data ? unmarked.length : '…'}
          suffix={`oxirgi ${ATTENDANCE_LOOKBACK_DAYS} kun`}
          to="/teacher/attendance"
        />
        <StatTile
          label="Talabalar"
          value={students}
          suffix={`${groups.data.length} guruh`}
          to="/teacher/groups"
        />
      </StatRow>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <div
          style={{
            flex: '999 1 560px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {featured ? (
            <FeaturedLesson lesson={featured} students={studentsByGroup.get(featured.group)} />
          ) : (
            <div className="ee-sunken">
              <h2 className="ee-heading">Rejalashtirilgan dars yo'q</h2>
              <p className="ee-muted" style={{ margin: '4px 0 12px' }}>
                Keyingi darslarni «Darslar» bo'limida qo'shing.
              </p>
              <Link to="/teacher/lessons" style={{ fontWeight: 700 }}>
                Darslarga o'tish
              </Link>
            </div>
          )}

          {today.length > 1 && (
            <section
              className="ee-panel"
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <h2 className="ee-heading">Bugungi darslar</h2>
              {today.map((l) => {
                const state = lessonState(l, now)
                return (
                  <Link
                    key={l.id}
                    to={`/teacher/attendance?lesson=${l.id}`}
                    className="ee-row-link"
                  >
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 14 }}>
                        {l.lesson_number}-dars · {l.title}
                      </strong>
                      <span className="ee-muted" style={{ fontSize: 13 }}>
                        {l.group_name}
                      </span>
                    </span>
                    <Flex align="center" gap={8}>
                      {state === 'now' && <Tag variant="pos">Hozir</Tag>}
                      {state === 'done' && <Tag variant="neu">O'tildi</Tag>}
                      <span className="ee-mono" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                        {formatTime(l.start_time)}–{formatTime(l.end_time)}
                      </span>
                    </Flex>
                  </Link>
                )
              })}
            </section>
          )}

          {unmarked.length > 0 && (
            <section
              className="ee-panel"
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <Flex justify="space-between" align="baseline" gap={12}>
                <h2 className="ee-heading">Davomat qilinmagan</h2>
                <Tag variant="warn">{unmarked.length} ta dars</Tag>
              </Flex>
              {unmarked.slice(0, 5).map((l) => (
                <Link key={l.id} to={`/teacher/attendance?lesson=${l.id}`} className="ee-row-link">
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>
                      {l.lesson_number}-dars · {l.title}
                    </strong>
                    <span className="ee-muted" style={{ fontSize: 13 }}>
                      {l.group_name}
                    </span>
                  </span>
                  <span className="ee-mono" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {dayjs(l.date).format('DD.MM')} · {formatTime(l.start_time)}
                  </span>
                </Link>
              ))}
            </section>
          )}
        </div>

        <aside
          style={{
            flex: '1 1 320px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <section
            className="ee-panel"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <Flex justify="space-between" align="baseline" gap={12}>
              <h2 className="ee-heading">Tekshirish kerak</h2>
              {toGrade.length > 0 && <Tag variant="prog">{toGrade.length}</Tag>}
            </Flex>
            {submissions.isPending ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : submissions.isError ? (
              <QueryError error={submissions.error} onRetry={() => submissions.refetch()} />
            ) : toGrade.length === 0 ? (
              <span className="ee-muted" style={{ fontSize: 14 }}>
                Hamma topshiriqlar baholangan.
              </span>
            ) : (
              <>
                {toGrade.slice(0, 5).map((s) => (
                  <Link
                    key={s.id}
                    to={`/teacher/homework?hw=${s.homework}&s=${s.id}`}
                    className="ee-row-link"
                    style={{ alignItems: 'center' }}
                  >
                    <Flex align="center" gap={10} style={{ minWidth: 0 }}>
                      <span className="ee-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {initials(s.student_name ?? '?')}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: 14 }}>{s.student_name}</strong>
                        <span
                          className="ee-muted"
                          style={{ fontSize: 13, overflowWrap: 'anywhere' }}
                        >
                          {s.homework_title}
                        </span>
                      </span>
                    </Flex>
                    <span className="ee-mono" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatShortDateTime(s.submitted_at)}
                    </span>
                  </Link>
                ))}
                {toGrade.length > 5 && (
                  <Link to="/teacher/homework" style={{ fontSize: 14, fontWeight: 700 }}>
                    Yana {toGrade.length - 5} ta
                  </Link>
                )}
              </>
            )}
          </section>

          <section
            className="ee-panel"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <h2 className="ee-heading">Yaqin muddatlar</h2>
            {homework.isPending || exams.isPending ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : deadlines.length === 0 ? (
              <span className="ee-muted" style={{ fontSize: 14 }}>
                Yaqin muddatli vazifa yoki imtihon yo'q.
              </span>
            ) : (
              deadlines.map((d) => (
                <Link key={d.key} to={d.to} className="ee-row-link">
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14, overflowWrap: 'anywhere' }}>
                      {d.title}
                    </strong>
                    <span className="ee-muted" style={{ fontSize: 13 }}>
                      {d.meta}
                    </span>
                  </span>
                  <span className="ee-mono" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {formatShortDateTime(d.deadline)}
                  </span>
                </Link>
              ))
            )}
          </section>
        </aside>
      </div>
    </Flex>
  )
}

/** Ink fonli blok — hozirgi yoki keyingi dars */
function FeaturedLesson({ lesson, students }: { lesson: Lesson; students?: number }) {
  const navigate = useNavigate()
  const state = lessonState(lesson)
  const isToday = dayjs(lesson.date).isSame(dayjs(), 'day')
  const label = state === 'now' ? 'Hozir davom etmoqda' : isToday ? 'Bugungi dars' : 'Keyingi dars'

  return (
    <FeaturedBlock
      tag={label}
      title={`${lesson.lesson_number}-dars · ${lesson.title}`}
      description={lesson.description || undefined}
      facts={[
        { label: 'Guruh', value: lesson.group_name },
        { label: 'Sana', value: isToday ? 'Bugun' : dayjs(lesson.date).format('DD.MM.YYYY') },
        {
          label: 'Vaqt',
          value: `${formatTime(lesson.start_time)}–${formatTime(lesson.end_time)}`,
        },
        { label: 'Talabalar', value: students ?? '—' },
      ]}
      aside={
        canMarkAttendance(lesson) ? (
          <Button
            type="primary"
            className="ee-btn-accent"
            style={{ height: 44 }}
            onClick={() => navigate(`/teacher/attendance?lesson=${lesson.id}`)}
          >
            Davomat qilish
          </Button>
        ) : (
          <>
            <span style={{ fontSize: 13, opacity: 0.8 }}>Davomat dars boshlanganda ochiladi</span>
            <Button
              type="primary"
              className="ee-btn-accent"
              style={{ height: 44 }}
              onClick={() => navigate(`/teacher/groups/${lesson.group}?tab=lessons`)}
            >
              Guruhni ochish
            </Button>
          </>
        )
      }
    />
  )
}
