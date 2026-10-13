import {
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Button, Empty, Flex, Progress, Skeleton } from 'antd'
import { useQueries } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router'

import { scheduleSummary } from '@/features/admin/schedules/scheduleMeta'
import type { Lesson, TeacherGroupDetail, TeacherGroupList } from '@/shared/api/generated/model'
import { customInstance } from '@/shared/api/mutator'
import { formatDate, formatTime } from '@/shared/lib/format'
import { PageHeader, QueryError, StatusTag } from '@/shared/ui'

import { teacherKeys, useAllAttendance, useTeacherGroups, useTeacherLessons } from '../api'
import { canMarkAttendance, lessonState } from '../lessons/lessonMeta'

/** Mening guruhlarim: kartochkalar (jadval, keyingi dars, tez o'tish tugmalari) */
export function TeacherGroupsPage() {
  const groups = useTeacherGroups()
  const lessons = useTeacherLessons()
  const attendance = useAllAttendance()
  // Jadval guruh tafsilotida — har bir guruh uchun (kesh guruh sahifasi bilan umumiy)
  const details = useQueries({
    queries: (groups.data ?? []).map((g) => ({
      queryKey: teacherKeys.group(g.id),
      queryFn: () =>
        customInstance<TeacherGroupDetail>({
          url: `/Educations/teacher/groups/${g.id}/`,
          method: 'GET',
        }),
    })),
  })

  if (groups.isPending) return <Skeleton active paragraph={{ rows: 8 }} />
  if (groups.isError) return <QueryError error={groups.error} onRetry={() => groups.refetch()} />

  const students = groups.data.reduce((sum, g) => sum + (g.active_students_count ?? 0), 0)
  const detailById = new Map(details.flatMap((d) => (d.data ? [[d.data.id, d.data] as const] : [])))
  const marked = new Set((attendance.data ?? []).map((a) => a.lesson))

  return (
    <>
      <PageHeader
        eyebrow={`${groups.data.length} ta guruh · ${students} talaba`}
        title="Guruhlarim"
        subtitle="Guruhni bosing — talabalar va darslar ro'yxati ochiladi"
      />

      {groups.data.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Sizga hali guruh biriktirilmagan — administratorga murojaat qiling" />
        </div>
      ) : (
        <div className="ee-group-grid">
          {groups.data.map((g) => {
            const own = (lessons.data ?? []).filter((l) => l.group === g.id)
            return (
              <GroupCard
                key={g.id}
                group={g}
                detail={detailById.get(g.id)}
                next={own
                  .filter((l) => lessonState(l) !== 'done')
                  .sort((a, b) =>
                    `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`),
                  )
                  .at(0)}
                // Davomati qilinmagan o'tgan darslar (davomat yuklanguncha hisoblanmaydi)
                unmarked={
                  attendance.data
                    ? own.filter((l) => canMarkAttendance(l) && !marked.has(l.id)).length
                    : 0
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}

function GroupCard({
  group: g,
  detail,
  next,
  unmarked,
}: {
  group: TeacherGroupList
  detail?: TeacherGroupDetail
  next?: Lesson
  unmarked: number
}) {
  const navigate = useNavigate()
  const schedule = detail ? scheduleSummary(detail.schedules) : []
  const count = g.active_students_count ?? 0

  return (
    <article className="ee-panel ee-group-card">
      <Link to={`/teacher/groups/${g.id}`} className="ee-group-card__link" aria-label={g.name} />
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div style={{ minWidth: 0 }}>
          <h2 className="ee-group-card__title">{g.name}</h2>
          <span className="ee-muted" style={{ fontSize: 13 }}>
            {g.course_name}
          </span>
        </div>
        <StatusTag kind="group" value={g.status} />
      </Flex>

      <div className="ee-group-card__schedule">
        <CalendarOutlined />
        {schedule.length ? (
          <span>
            {schedule.map((l) => (
              <span key={l} className="ee-num" style={{ display: 'block' }}>
                {l}
              </span>
            ))}
          </span>
        ) : (
          <span className="ee-muted">{detail ? 'Jadval tuzilmagan' : '…'}</span>
        )}
      </div>

      <Flex vertical gap={4} style={{ fontSize: 13 }}>
        <span>
          <span className="ee-muted">Keyingi dars: </span>
          {next ? (
            <strong className="ee-num">
              {dayjs(next.date).format('DD.MM')} · {formatTime(next.start_time)} —{' '}
              {next.lesson_number}-dars
            </strong>
          ) : (
            <span className="ee-muted">rejalashtirilmagan</span>
          )}
        </span>
        {detail && (
          <span>
            <span className="ee-muted">O'tilgan darslar: </span>
            <strong className="ee-num">
              {detail.lessons_count} / {detail.course_lesson_quantity}
            </strong>
          </span>
        )}
        {unmarked > 0 && (
          <strong style={{ position: 'relative', zIndex: 1 }}>
            <Link to="/teacher/attendance" style={{ color: 'inherit' }}>
              {unmarked} ta darsda davomat qilinmagan →
            </Link>
          </strong>
        )}
      </Flex>

      <div>
        <Flex justify="space-between" style={{ fontSize: 13 }}>
          <span className="ee-muted">Talabalar</span>
          <span className="ee-num">
            {count} / {g.capacity}
          </span>
        </Flex>
        <Progress
          percent={g.capacity ? Math.min(100, Math.round((count / g.capacity) * 100)) : 0}
          showInfo={false}
          size="small"
          style={{ margin: 0 }}
        />
      </div>

      <Flex gap={6} wrap style={{ position: 'relative', zIndex: 1 }}>
        <Button
          size="small"
          icon={<CheckSquareOutlined />}
          onClick={() => navigate('/teacher/attendance')}
        >
          Davomat
        </Button>
        <Button
          size="small"
          icon={<BookOutlined />}
          onClick={() => navigate(`/teacher/lessons?group=${g.id}`)}
        >
          Darslar
        </Button>
        <Button
          size="small"
          icon={<TrophyOutlined />}
          onClick={() => navigate(`/teacher/exams?group=${g.id}`)}
        >
          Imtihonlar
        </Button>
      </Flex>

      <span className="ee-muted" style={{ fontSize: 12 }}>
        Boshlangan: <span className="ee-num">{formatDate(g.start_date)}</span>
      </span>
    </article>
  )
}
