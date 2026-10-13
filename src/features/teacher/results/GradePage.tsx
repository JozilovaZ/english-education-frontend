import { Alert, App, Button, Flex, Input, InputNumber, Skeleton, Slider } from 'antd'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import type { ExamAttemptDetail } from '@/shared/api/generated/model'
import { formatShortDateTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { QueryError, Tag } from '@/shared/ui'
import { AnswerOption, optionLetter, ParentNotice, ScoreBar } from '@/shared/ui/exam'

import {
  normalizeQuestions,
  useAttempt,
  useGradeAttempt,
  useTeacherExam,
  type TeacherExam,
} from '../api'

/** Dizayndagi "O'qituvchi · Baholash" (/teacher/results/:id) */
export function GradePage() {
  const id = Number(useParams().id)
  const attempt = useAttempt(id)
  const examId = attempt.data?.exam ?? 0
  const exam = useTeacherExam(examId, !!examId)

  if (attempt.isPending || (attempt.isSuccess && exam.isPending))
    return <Skeleton active paragraph={{ rows: 10 }} />
  if (attempt.isError) return <QueryError error={attempt.error} onRetry={() => attempt.refetch()} />
  if (exam.isError) return <QueryError error={exam.error} onRetry={() => exam.refetch()} />
  return <Grade key={attempt.data.updated_at} attempt={attempt.data} exam={exam.data!} />
}

function extOf(url: string) {
  return url.split('?')[0].split('.').pop()?.toUpperCase() ?? 'FAYL'
}

function Grade({ attempt, exam }: { attempt: ExamAttemptDetail; exam: TeacherExam }) {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const handleError = useApiErrorHandler()
  const grade = useGradeAttempt()

  const questions = normalizeQuestions(exam.questions ?? [])
  const byQuestion = new Map(attempt.student_answers.map((a) => [a.question, a]))
  // Avtomatik ball — to'g'ri javoblar ballari yig'indisi (o'qituvchi bahosi uni almashtiradi)
  const autoScore = questions.reduce(
    (sum, q) => sum + (byQuestion.get(q.id)?.is_correct ? (q.points ?? 1) : 0),
    0,
  )
  const total = attempt.total_points
  const [score, setScore] = useState(attempt.score ?? autoScore)
  const [comment, setComment] = useState(attempt.teacher_comment ?? '')
  const passed = score >= attempt.passing_score
  const graded = !!attempt.teacher_comment || (attempt.score ?? 0) !== autoScore
  const backTo = `/teacher/results?exam=${exam.id}`

  const onGrade = () =>
    modal.confirm({
      title: 'Baholab, ota-onaga yuborasizmi?',
      content: `${attempt.student_name}: ${score} / ${total} — ${passed ? "O'tdi" : "O'ta olmadi"}. Natija ota-onaga Telegram orqali yuboriladi.`,
      okText: 'Yuborish',
      cancelText: 'Qaytish',
      okButtonProps: { className: 'ee-btn-accent' },
      onOk: () =>
        grade
          .mutateAsync({ id: attempt.id, score, teacher_comment: comment.trim() })
          .then((res) => {
            message.success(res.message || 'Baholandi')
            navigate(backTo)
          })
          .catch((e) => handleError(e)),
    })

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={6}>
        <span className="ee-muted" style={{ fontSize: 13 }}>
          <Link to={backTo} style={{ color: 'inherit' }}>
            Natijalar
          </Link>{' '}
          / {attempt.student_name}
        </span>
        <h1 className="ee-title" style={{ overflowWrap: 'anywhere' }}>
          {attempt.student_name} — {exam.name}
        </h1>
        <span className="ee-muted ee-mono" style={{ fontSize: 13 }}>
          Boshlandi {formatShortDateTime(attempt.started_at)} · Topshirildi{' '}
          {formatShortDateTime(attempt.finished_at)} · Avtomatik ball: {autoScore}
        </span>
      </Flex>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <section
          style={{
            flex: '999 1 560px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {attempt.submission_file && (
            <div className="ee-panel" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="ee-filetype">{extOf(attempt.submission_file)}</span>
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <strong style={{ display: 'block' }}>Yuklangan yechim fayli</strong>
                <span className="ee-muted" style={{ fontSize: 13 }}>
                  Yozma qism
                </span>
              </div>
              <Button href={attempt.submission_file} target="_blank" rel="noreferrer">
                Ochish
              </Button>
            </div>
          )}

          <h2 className="ee-heading">Test javoblari</h2>
          {questions.length === 0 ? (
            <span className="ee-muted">Imtihonda savol yo'q.</span>
          ) : (
            <Flex vertical gap={16}>
              {questions.map((q, i) => {
                const ans = byQuestion.get(q.id)
                const correctIndex = q.answers.findIndex((a) => a.is_correct)
                const correct = q.answers[correctIndex]
                const pickedIndex = q.answers.findIndex((a) => a.id === ans?.selected_answer)
                return (
                  <Flex key={q.id} vertical gap={8}>
                    <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                      {i + 1}. {q.question}{' '}
                      <span className="ee-muted ee-mono" style={{ fontWeight: 500, fontSize: 13 }}>
                        · {q.points ?? 1} ball
                      </span>
                    </span>
                    {ans?.selected_answer ? (
                      <AnswerOption
                        readOnly
                        name={`g${q.id}`}
                        value={ans.selected_answer}
                        letter={optionLetter(Math.max(0, pickedIndex))}
                        state={ans.is_correct ? 'correct' : 'wrong'}
                      >
                        {ans.selected_answer_text}
                      </AnswerOption>
                    ) : (
                      <div>
                        <Tag variant="warn">Javob berilmagan</Tag>
                      </div>
                    )}
                    {/* O'qituvchiga to'g'ri javob ham ko'rsatiladi */}
                    {!ans?.is_correct && correct && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span className="ee-muted">To'g'ri javob:</span>
                        <strong>
                          {optionLetter(correctIndex)}. {correct.answer}
                        </strong>
                      </div>
                    )}
                  </Flex>
                )
              })}
            </Flex>
          )}
        </section>

        <aside
          style={{
            flex: '1 1 380px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {!attempt.is_completed ? (
            <Alert
              type="info"
              showIcon
              title="Talaba hali imtihonni topshirmagan"
              description="Baholash topshirilgandan keyin mumkin bo'ladi."
            />
          ) : (
            <div
              className="ee-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                border: '2px solid var(--ee-text)',
              }}
            >
              <h2 className="ee-heading">{graded ? "Bahoni o'zgartirish" : 'Baholash'}</h2>
              <div className="ee-field">
                <span className="ee-field__label" id="score-label">
                  Yakuniy ball: {score}
                </span>
                <Flex gap={12} align="center">
                  <Slider
                    min={0}
                    max={total}
                    value={score}
                    onChange={setScore}
                    style={{ flex: 1 }}
                    aria-labelledby="score-label"
                  />
                  <InputNumber
                    min={0}
                    max={total}
                    precision={0}
                    value={score}
                    onChange={(v) => setScore(Math.min(total, Math.max(0, v ?? 0)))}
                    style={{ width: 80 }}
                    aria-label="Yakuniy ball"
                  />
                </Flex>
              </div>
              <ScoreBar score={score} total={total} passing={attempt.passing_score} />
              <label className="ee-field">
                <span className="ee-field__label">O'qituvchi sharhi</span>
                <Input.TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  placeholder="Masalan: Reading qismini takrorlang."
                />
              </label>
              <Button
                type="primary"
                className="ee-btn-accent"
                style={{ height: 44 }}
                loading={grade.isPending}
                onClick={onGrade}
              >
                Baholash va ota-onaga yuborish
              </Button>
            </div>
          )}
          <span className="ee-eyebrow">Ota-onaga shunday boradi</span>
          <ParentNotice
            studentName={attempt.student_name}
            groupName={exam.group_name}
            examName={exam.name}
            teacherName={exam.teacher_name}
            score={score}
            total={total}
            passing={attempt.passing_score}
            passed={passed}
            comment={comment.trim()}
          />
        </aside>
      </div>
    </Flex>
  )
}
