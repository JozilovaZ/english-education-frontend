import { Button, Empty, Flex, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router'

import type { ExamAttemptDetail } from '@/shared/api/generated/model'
import { formatShortDateTime } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { QueryError, StatTile, Tag, type TagVariant } from '@/shared/ui'
import {
  ATTEMPT_TABS as TABS,
  attemptStatus as rowStatus,
  type AttemptFilter as Filter,
} from '@/shared/ui/exam'

import { useGroupStudents, useTeacherAttempts, useTeacherExams, type TeacherExam } from '../api'

interface Row {
  key: string
  name: string
  attempt?: ExamAttemptDetail
  status: Filter
  tag: { variant: TagVariant; label: string }
}

/** Dizayndagi "O'qituvchi · Natijalar ro'yxati" (/teacher/results?exam=ID) */
export function AttemptsPage() {
  const exams = useTeacherExams()
  const attempts = useTeacherAttempts()
  const [params, setParams] = useUrlState()

  if (exams.isPending || attempts.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (exams.isError) return <QueryError error={exams.error} onRetry={() => exams.refetch()} />
  if (attempts.isError)
    return <QueryError error={attempts.error} onRetry={() => attempts.refetch()} />

  const list = [...exams.data].sort((a, b) => dayjs(b.deadline).diff(dayjs(a.deadline)))
  if (list.length === 0)
    return (
      <Empty description="Hali imtihon yo'q">
        <Link to="/teacher/exams">Imtihon yaratish</Link>
      </Empty>
    )

  // Tanlanmagan bo'lsa — oxirgi topshirilgan imtihon, bo'lmasa eng yangisi
  const lastAttempted = [...attempts.data].sort((a, b) => b.id - a.id)[0]?.exam
  const examId = Number(params.get('exam')) || lastAttempted || list[0].id
  const exam = list.find((e) => e.id === examId) ?? list[0]

  return (
    <ExamResults
      key={exam.id}
      exam={exam}
      exams={list}
      attempts={attempts.data.filter((a) => a.exam === exam.id)}
      filter={(params.get('f') as Filter) || 'all'}
      onFilter={(f) => setParams({ f: f === 'all' ? null : f })}
      onExam={(id) => setParams({ exam: id, f: null })}
    />
  )
}

function ExamResults({
  exam,
  exams,
  attempts,
  filter,
  onFilter,
  onExam,
}: {
  exam: TeacherExam
  exams: TeacherExam[]
  attempts: ExamAttemptDetail[]
  filter: Filter
  onFilter: (f: Filter) => void
  onExam: (id: number) => void
}) {
  const navigate = useNavigate()
  const students = useGroupStudents(exam.group)

  // Guruhdagi har bir talaba + guruhdan chiqib ketgan, lekin topshirganlar
  const byStudent = new Map(attempts.map((a) => [a.student, a]))
  const rows: Row[] = [
    ...(students.data ?? []).map((s) => {
      const a = byStudent.get(s.student_id)
      byStudent.delete(s.student_id)
      return {
        key: `s${s.student_id}`,
        name: s.student_name ?? s.student_username ?? '—',
        attempt: a,
        ...rowStatus(a),
      }
    }),
    ...[...byStudent.values()].map((a) => ({
      key: `a${a.id}`,
      name: a.student_name,
      attempt: a,
      ...rowStatus(a),
    })),
  ].sort((x, y) => x.name.localeCompare(y.name))

  const completed = attempts.filter((a) => a.is_completed)
  const passCount = rows.filter((r) => r.status === 'pass').length
  const failCount = rows.filter((r) => r.status === 'fail').length
  const avg = completed.length
    ? Math.round((completed.reduce((s, a) => s + (a.score ?? 0), 0) / completed.length) * 10) / 10
    : null
  const shown = rows.filter((r) => filter === 'all' || r.status === filter)

  return (
    <Flex vertical gap={24}>
      <Flex justify="space-between" align="flex-end" gap={16} wrap>
        <Flex vertical gap={6} style={{ minWidth: 0 }}>
          <span className="ee-muted" style={{ fontSize: 13 }}>
            <Link to="/teacher/exams" style={{ color: 'inherit' }}>
              Imtihonlar
            </Link>{' '}
            / {exam.name} / Natijalar
          </span>
          <h1 className="ee-title" style={{ overflowWrap: 'anywhere' }}>
            {exam.name} — natijalar
          </h1>
        </Flex>
        <Select
          aria-label="Imtihon"
          value={exam.id}
          onChange={onExam}
          showSearch
          optionFilterProp="label"
          style={{ minWidth: 260 }}
          options={exams.map((e) => ({ value: e.id, label: `${e.name} · ${e.group_name}` }))}
        />
      </Flex>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: 16,
        }}
      >
        <StatTile
          label="Topshirdi"
          value={completed.length}
          suffix={students.data ? `/ ${students.data.length}` : undefined}
        />
        <StatTile label="O'tdi" value={passCount} tone="accent" />
        <StatTile label="O'ta olmadi" value={failCount} tone="ink" />
        <StatTile
          label="O'rtacha ball"
          value={avg ?? '—'}
          suffix={avg !== null ? `/ ${exam.total_points}` : undefined}
        />
      </div>

      <div role="tablist" aria-label="Filtr" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`ee-pill${filter === id ? ' is-on' : ''}`}
            onClick={() => onFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {students.isPending ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : shown.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Bu filtr bo'yicha talaba yo'q" />
        </div>
      ) : (
        <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ee-table">
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Boshlandi</th>
                <th>Topshirildi</th>
                <th>Ball</th>
                <th>Holati</th>
                <th>Sharh</th>
                <th aria-label="Harakatlar" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const a = r.attempt
                return (
                  <tr key={r.key}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                      {a ? formatShortDateTime(a.started_at) : '—'}
                    </td>
                    <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                      {a?.is_completed ? formatShortDateTime(a.finished_at) : '—'}
                    </td>
                    <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                      {a?.is_completed ? (
                        <strong>
                          {a.score ?? 0} / {a.total_points}
                        </strong>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <Tag variant={r.tag.variant}>{r.tag.label}</Tag>
                    </td>
                    <td className="ee-muted" style={{ fontSize: 13, maxWidth: 260 }}>
                      <span
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {a?.teacher_comment || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {a?.is_completed && (
                        <Button
                          type="link"
                          style={{ fontWeight: 700 }}
                          onClick={() => navigate(`/teacher/results/${a.id}`)}
                        >
                          {a.teacher_comment ? "Ko'rish" : 'Baholash'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Flex>
  )
}
