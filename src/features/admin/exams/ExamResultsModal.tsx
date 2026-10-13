import { Empty, Flex, Modal, Skeleton } from 'antd'
import { useState } from 'react'

import type { ExamAttemptDetail } from '@/shared/api/generated/model'
import { formatDuration, formatShortDateTime } from '@/shared/lib/format'
import { Tag } from '@/shared/ui'
import { ATTEMPT_TABS, attemptStatus, Facts, type AttemptFilter } from '@/shared/ui/exam'

import { useGroupStudents, type AdminExam } from '../api'

interface Props {
  exam: AdminExam | null
  /** Shu imtihonning urinishlari */
  attempts: ExamAttemptDetail[]
  onClose: () => void
}

/** Imtihon natijalari (admin faqat ko'radi — baholashni o'qituvchi qiladi) */
export function ExamResultsModal({ exam, attempts, onClose }: Props) {
  return (
    <Modal
      open={exam !== null}
      onCancel={onClose}
      footer={null}
      width={820}
      centered
      destroyOnHidden
      title={exam?.name}
    >
      {exam && <Results exam={exam} attempts={attempts} />}
    </Modal>
  )
}

function Results({ exam, attempts }: { exam: AdminExam; attempts: ExamAttemptDetail[] }) {
  const students = useGroupStudents(exam.group)
  const [filter, setFilter] = useState<AttemptFilter>('all')

  // Guruhdagi hozirgi talabalar + guruhdan chiqib ketgan, lekin topshirganlar
  const byStudent = new Map(attempts.map((a) => [a.student, a]))
  const rows = [
    ...(students.data ?? [])
      .filter((s) => !s.left_at)
      .map((s) => {
        const a = byStudent.get(s.student_id)
        byStudent.delete(s.student_id)
        return { key: `s${s.student_id}`, name: s.student_name ?? s.student_username ?? '—', a }
      }),
    ...[...byStudent.values()].map((a) => ({ key: `a${a.id}`, name: a.student_name, a })),
  ]
    .map((r) => ({ ...r, ...attemptStatus(r.a) }))
    .sort((x, y) => x.name.localeCompare(y.name))

  const completed = attempts.filter((a) => a.is_completed)
  const avg = completed.length
    ? Math.round((completed.reduce((s, a) => s + (a.score ?? 0), 0) / completed.length) * 10) / 10
    : null
  const countOf = (f: AttemptFilter) =>
    f === 'all' ? rows.length : rows.filter((r) => r.status === f).length
  const shown = rows.filter((r) => filter === 'all' || r.status === filter)

  return (
    <Flex vertical gap={20}>
      <span className="ee-muted" style={{ marginTop: -8 }}>
        {exam.group_name} · {exam.teacher_name}
      </span>

      <Facts
        size="sm"
        items={[
          { label: 'Muddat', value: formatShortDateTime(exam.deadline) },
          { label: 'Vaqt', value: formatDuration(exam.duration) },
          { label: 'Savollar', value: `${exam.questions_count} · ${exam.total_points} ball` },
          { label: "O'tish bali", value: exam.passing_score ?? 0 },
          { label: "O'rtacha ball", value: avg ?? '—' },
        ]}
      />

      <div role="tablist" aria-label="Filtr" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ATTEMPT_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`ee-pill${filter === id ? ' is-on' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label} · {countOf(id)}
          </button>
        ))}
      </div>

      {students.isPending ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : shown.length === 0 ? (
        <Empty description="Bu filtr bo'yicha talaba yo'q" />
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '50vh' }}>
          <table className="ee-table ee-table--compact">
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Topshirildi</th>
                <th>Ball</th>
                <th>Holati</th>
                <th>O'qituvchi izohi</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ key, name, a, tag }) => (
                <tr key={key}>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td className="ee-num" style={{ whiteSpace: 'nowrap' }}>
                    {a?.is_completed ? formatShortDateTime(a.finished_at) : '—'}
                  </td>
                  <td className="ee-num" style={{ whiteSpace: 'nowrap' }}>
                    {a?.is_completed ? (
                      <strong>
                        {a.score ?? 0} / {a.total_points}
                      </strong>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <Tag variant={tag.variant}>{tag.label}</Tag>
                  </td>
                  <td className="ee-muted" style={{ fontSize: 13, maxWidth: 220 }}>
                    {a?.teacher_comment || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Flex>
  )
}
