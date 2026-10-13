import { PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Flex, Skeleton, Tabs } from 'antd'
import { useNavigate, useParams } from 'react-router'

import type { Lesson } from '@/shared/api/generated/model'
import { formatDate, formatPhone, formatTime } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { PageHeader, QueryError, StatusTag, useFormDrawer } from '@/shared/ui'
import { Facts } from '@/shared/ui/exam'

import { useGroupStudents, useTeacherGroup, useTeacherGroups, useTeacherLessons } from '../api'
import { LessonDrawer } from '../lessons/LessonDrawer'
import { byDateDesc, initials } from '../lessons/lessonMeta'
import { LessonsTable } from '../lessons/LessonsTable'

/** Guruh sahifasi: ma'lumotlar, jadval, talabalar va darslar */
export function TeacherGroupDetailPage() {
  const id = Number(useParams().id)
  const group = useTeacherGroup(id)
  const groups = useTeacherGroups()
  const students = useGroupStudents(id)
  const lessons = useTeacherLessons()
  const drawer = useFormDrawer<Lesson>()
  const [params, setParams] = useUrlState()
  const navigate = useNavigate()

  if (group.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (group.isError) return <QueryError error={group.error} onRetry={() => group.refetch()} />

  const g = group.data
  const groupLessons = (lessons.data ?? []).filter((l) => l.group === id).sort(byDateDesc)

  return (
    <>
      <PageHeader
        eyebrow={g.course_name}
        title={g.name}
        backTo="/teacher/groups"
        extra={
          <>
            <StatusTag kind="group" value={g.status} />
            <Button onClick={() => navigate(`/teacher/exams?group=${id}`)}>Imtihonlar</Button>
            <Button onClick={() => navigate(`/teacher/materials?group=${id}`)}>Materiallar</Button>
          </>
        }
      />

      <div className="ee-panel" style={{ marginBottom: 24 }}>
        <Facts
          items={[
            {
              label: 'Talabalar',
              value: `${g.active_students_count} / ${g.capacity}`,
            },
            {
              label: 'Darslar',
              value: `${g.lessons_count} / ${g.course_lesson_quantity}`,
            },
            { label: 'Boshlangan', value: formatDate(g.start_date) },
            ...(g.end_date ? [{ label: 'Tugagan', value: formatDate(g.end_date) }] : []),
          ]}
        />
        {g.schedules.length > 0 && (
          <Flex gap={8} wrap style={{ marginTop: 16 }}>
            {g.schedules.map((s) => (
              <span key={s.id} className="ee-tag ee-tag--neu ee-mono">
                {s.day_of_week_display} {formatTime(s.start_time)}–{formatTime(s.end_time)}
                {s.room && ` · ${s.room}`}
              </span>
            ))}
          </Flex>
        )}
      </div>

      <Tabs
        activeKey={params.get('tab') ?? 'students'}
        onChange={(tab) => setParams({ tab: tab === 'students' ? null : tab })}
        items={[
          {
            key: 'students',
            label: `Talabalar (${students.data?.length ?? g.active_students_count})`,
            children: students.isPending ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : students.isError ? (
              <QueryError error={students.error} onRetry={() => students.refetch()} />
            ) : students.data.length === 0 ? (
              <div className="ee-panel">
                <Empty description="Guruhda hali talaba yo'q" />
              </div>
            ) : (
              <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="ee-table ee-table--compact">
                  <thead>
                    <tr>
                      <th>Talaba</th>
                      <th>Telefon</th>
                      <th>Qo'shilgan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.data.map((s) => {
                      const name = s.student_name || s.student_username
                      return (
                        <tr key={s.id}>
                          <td style={{ minWidth: 180 }}>
                            <Flex align="center" gap={10}>
                              <span
                                className="ee-avatar"
                                style={{ width: 32, height: 32, fontSize: 12 }}
                              >
                                {initials(name)}
                              </span>
                              <span>
                                <strong style={{ display: 'block' }}>{name}</strong>
                                <span className="ee-muted ee-mono" style={{ fontSize: 12 }}>
                                  @{s.student_username}
                                </span>
                              </span>
                            </Flex>
                          </td>
                          <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                            {s.student_phone ? (
                              <a href={`tel:${s.student_phone}`}>{formatPhone(s.student_phone)}</a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="ee-mono">{formatDate(s.joined_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ),
          },
          {
            key: 'lessons',
            label: `Darslar (${g.lessons_count})`,
            children: lessons.isPending ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : lessons.isError ? (
              <QueryError error={lessons.error} onRetry={() => lessons.refetch()} />
            ) : (
              <Flex vertical gap={16}>
                <Flex justify="flex-end">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={drawer.openCreate}
                    disabled={g.status === 'completed' || g.status === 'cancelled'}
                  >
                    Yangi dars
                  </Button>
                </Flex>
                <LessonsTable
                  lessons={groupLessons}
                  onEdit={drawer.openEdit}
                  emptyText="Bu guruhda hali dars yo'q"
                />
              </Flex>
            ),
          },
        ]}
      />

      {groups.data && lessons.data && (
        <LessonDrawer
          open={drawer.open}
          lesson={drawer.record}
          groups={groups.data}
          lessons={lessons.data}
          defaultGroup={id}
          onClose={drawer.close}
        />
      )}
    </>
  )
}
