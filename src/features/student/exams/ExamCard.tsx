import { Button } from 'antd'
import { useNavigate } from 'react-router'

import { formatShortDateTime, formatTimeLeft } from '@/shared/lib/format'
import { Tag } from '@/shared/ui'
import { Facts } from '@/shared/ui/exam'

import { EXAM_STATE_TAG, examDuration } from './examMeta'
import { getExamState, type StudentExam } from './types'

export function ExamStateTag({ exam }: { exam: StudentExam }) {
  const state = getExamState(exam)
  const attempt = exam.my_attempt
  if (state === 'completed' && attempt) {
    return <Tag variant={attempt.is_passed ? 'pos' : 'neg'}>{attempt.score} ball</Tag>
  }
  const meta = EXAM_STATE_TAG[state]
  return <Tag variant={meta.variant}>{meta.label}</Tag>
}

/** Dizayn tizimidagi ExamCard: nom, guruh · o'qituvchi, holat, faktlar, harakat */
export function ExamCard({ exam }: { exam: StudentExam }) {
  const navigate = useNavigate()
  const state = getExamState(exam)
  const base = `/student/exams/${exam.id}`

  const action =
    state === 'available' ? (
      <Button className="ee-btn-accent" type="primary" onClick={() => navigate(base)}>
        Boshlash
      </Button>
    ) : state === 'in_progress' ? (
      <Button className="ee-btn-accent" type="primary" onClick={() => navigate(`${base}/take`)}>
        Davom ettirish
      </Button>
    ) : state === 'completed' ? (
      <Button size="small" onClick={() => navigate(`${base}/result`)}>
        Natijani ko'rish
      </Button>
    ) : (
      <Button size="small" type="text" onClick={() => navigate(base)}>
        Batafsil
      </Button>
    )

  return (
    <article className="ee-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="ee-heading" style={{ overflowWrap: 'anywhere' }}>
            {exam.name}
          </h3>
          <p className="ee-muted" style={{ margin: '4px 0 0', fontSize: 13, lineHeight: '18px' }}>
            {exam.group_name} · {exam.teacher_name}
          </p>
        </div>
        <div style={{ flex: 'none' }}>
          <ExamStateTag exam={exam} />
        </div>
      </div>
      <Facts
        size="sm"
        style={{
          padding: '12px 0',
          borderTop: '1px solid var(--ee-border)',
          borderBottom: '1px solid var(--ee-border)',
          gap: 8,
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        }}
        items={[
          {
            label: 'Muddat',
            value: (
              <>
                {formatShortDateTime(exam.deadline)}
                {state === 'available' && formatTimeLeft(exam.deadline) && (
                  <span className="ee-muted" style={{ display: 'block', fontSize: 12 }}>
                    {formatTimeLeft(exam.deadline)}
                  </span>
                )}
              </>
            ),
          },
          { label: 'Vaqt', value: examDuration(exam) },
          { label: "O'tish", value: `${exam.passing_score ?? 0} / ${exam.total_points}` },
        ]}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginTop: 'auto',
        }}
      >
        <span className="ee-muted" style={{ fontSize: 13 }}>
          {exam.questions_count} ta savol
        </span>
        {action}
      </div>
    </article>
  )
}
