import { Button, Flex, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'

import type { ExamAttemptDetail } from '@/shared/api/generated/model'
import { formatHms, formatShortDateTime } from '@/shared/lib/format'
import { QueryError, Tag } from '@/shared/ui'
import { AnswerOption, Facts, optionLetter, ParentNotice, ScoreBar } from '@/shared/ui/exam'

import { useMyAttempt, useStudentExam } from './api'
import { wasSubmitted, type StudentExam } from './types'

export function ExamResultPage() {
  const id = Number(useParams().id)
  const exam = useStudentExam(id)
  const attempt = useMyAttempt(id)

  if (exam.isPending || attempt.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (exam.isError) return <QueryError error={exam.error} onRetry={() => exam.refetch()} />
  if (attempt.isError) return <QueryError error={attempt.error} onRetry={() => attempt.refetch()} />

  // Hali tugamagan yoki javobsiz yopilgan urinish — holat sahifasida tushuntiriladi
  if (!attempt.data.is_completed || !wasSubmitted(attempt.data)) {
    return <Navigate to={`/student/exams/${id}`} replace />
  }
  return <ExamResult exam={exam.data} attempt={attempt.data} />
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function ExamResult({ exam, attempt }: { exam: StudentExam; attempt: ExamAttemptDetail }) {
  const navigate = useNavigate()
  const location = useLocation()
  const submitted = (location.state as { submitted?: string } | null)?.submitted

  const score = attempt.score ?? 0
  const passed = attempt.is_passed ?? score >= attempt.passing_score
  const spent =
    attempt.finished_at && attempt.started_at
      ? dayjs(attempt.finished_at).diff(dayjs(attempt.started_at), 'second')
      : null
  const byQuestion = new Map(attempt.student_answers.map((a) => [a.question, a]))

  return (
    <Flex vertical gap={24}>
      {submitted && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 20px',
            borderRadius: 8,
            background: 'var(--ee-accent-soft)',
            border: '1.5px solid var(--ee-text)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            style={{ flex: 'none' }}
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
          {submitted}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <section
          style={{
            flex: '999 1 600px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <Flex vertical gap={8}>
            <span className="ee-eyebrow">
              {exam.group_name} · {exam.teacher_name}
            </span>
            <h1 className="ee-title" style={{ overflowWrap: 'anywhere' }}>
              {exam.name}
            </h1>
          </Flex>

          <div className="ee-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ScoreBar
              score={score}
              total={attempt.total_points}
              passing={attempt.passing_score}
              passed={passed}
            />
            <Facts
              style={{ paddingTop: 16, borderTop: '1px solid var(--ee-border)' }}
              items={[
                { label: 'Boshlandi', value: formatShortDateTime(attempt.started_at) },
                { label: 'Topshirildi', value: formatShortDateTime(attempt.finished_at) },
                { label: 'Sarflangan vaqt', value: spent === null ? '—' : formatHms(spent) },
              ]}
            />
            {attempt.submission_file && (
              <a
                href={attempt.submission_file}
                target="_blank"
                rel="noreferrer"
                style={{ fontWeight: 700, fontSize: 14, alignSelf: 'flex-start' }}
              >
                Yuklangan yechim faylini ochish
              </a>
            )}
          </div>

          {attempt.teacher_comment && (
            <div className="ee-sunken" style={{ display: 'flex', gap: 16, padding: '20px 24px' }}>
              <span className="ee-avatar">{initials(exam.teacher_name)}</span>
              <Flex vertical gap={4}>
                <span className="ee-eyebrow">O'qituvchi sharhi · {exam.teacher_name}</span>
                <p style={{ margin: 0, fontSize: 16, lineHeight: '24px', whiteSpace: 'pre-line' }}>
                  {attempt.teacher_comment}
                </p>
              </Flex>
            </div>
          )}

          {exam.questions.length > 0 && (
            <>
              <h2 className="ee-heading">Javoblaringiz</h2>
              <Flex vertical gap={20}>
                {exam.questions.map((q, i) => {
                  const answer = byQuestion.get(q.id)
                  const index = q.options.findIndex((o) => o.id === answer?.selected_answer)
                  return (
                    <Flex key={q.id} vertical gap={8}>
                      <Flex justify="space-between" gap={12}>
                        <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                          {i + 1}. {q.question}
                        </span>
                        <span className="ee-mono ee-muted" style={{ fontSize: 13, flex: 'none' }}>
                          {answer?.is_correct ? q.points : 0} / {q.points}
                        </span>
                      </Flex>
                      {answer?.selected_answer ? (
                        <AnswerOption
                          readOnly
                          name={`r${q.id}`}
                          value={answer.selected_answer}
                          letter={optionLetter(Math.max(0, index))}
                          state={answer.is_correct ? 'correct' : 'wrong'}
                        >
                          {answer.selected_answer_text}
                        </AnswerOption>
                      ) : (
                        <div>
                          <Tag variant="warn">Javob berilmagan</Tag>
                        </div>
                      )}
                    </Flex>
                  )
                })}
              </Flex>
            </>
          )}
        </section>

        <aside
          style={{
            flex: '1 1 340px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span className="ee-eyebrow">Ota-onangizga yuboriladigan xabar</span>
          <ParentNotice
            studentName={attempt.student_name}
            groupName={exam.group_name}
            examName={exam.name}
            teacherName={exam.teacher_name}
            score={score}
            total={attempt.total_points}
            passing={attempt.passing_score}
            passed={passed}
            comment={attempt.teacher_comment}
          />
          <span className="ee-muted" style={{ fontSize: 13 }}>
            Xabar ota-onangiz markaz Telegram botiga ulangan bo'lsa yuboriladi.
          </span>
          <Button
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
            onClick={() => navigate('/student')}
          >
            Bosh sahifaga qaytish
          </Button>
        </aside>
      </div>
    </Flex>
  )
}
