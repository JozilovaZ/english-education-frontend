import { App, Button, Flex, Skeleton } from 'antd'
import dayjs from 'dayjs'
import minMax from 'dayjs/plugin/minMax'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { parseApiError } from '@/shared/api/errors'
import {
  durationToSeconds,
  formatDuration,
  formatHms,
  formatShortDateTime,
} from '@/shared/lib/format'
import { QueryError, Tag } from '@/shared/ui'
import { Facts, Timer } from '@/shared/ui/exam'

import { useMyAttempt, useStartExam, useStudentExam } from './api'
import { ExamStateTag } from './ExamCard'
import { examDuration } from './examMeta'
import { getExamState, wasSubmitted, type StudentExam } from './types'

dayjs.extend(minMax)

export function ExamStartPage() {
  const id = Number(useParams().id)
  const exam = useStudentExam(id)

  if (exam.isPending) return <Skeleton active paragraph={{ rows: 8 }} />
  if (exam.isError) return <QueryError error={exam.error} onRetry={() => exam.refetch()} />
  return <ExamStart exam={exam.data} />
}

function ExamStart({ exam }: { exam: StudentExam }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const start = useStartExam()
  const state = getExamState(exam)
  const durationSeconds = exam.duration ? durationToSeconds(exam.duration) : null

  const onStart = () =>
    start.mutate(exam.id, {
      onSuccess: () => navigate(`/student/exams/${exam.id}/take`),
      onError: (error) => message.error(parseApiError(error).message),
    })

  return (
    <Flex vertical gap={24} style={{ maxWidth: 1040 }}>
      <span style={{ fontSize: 13 }} className="ee-muted">
        <Link to="/student/exams" style={{ color: 'inherit' }}>
          Imtihonlar
        </Link>{' '}
        / {exam.name}
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <section
          style={{
            flex: '999 1 520px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <Flex gap={8} wrap>
            <ExamStateTag exam={exam} />
            <Tag variant="neu">{exam.group_name}</Tag>
          </Flex>
          <h1
            className="ee-display"
            style={{ fontSize: 44, lineHeight: '48px', overflowWrap: 'anywhere' }}
          >
            {exam.name}
          </h1>
          {exam.description && (
            <p style={{ margin: 0, fontSize: 16, lineHeight: '24px', whiteSpace: 'pre-line' }}>
              {exam.description}
            </p>
          )}
          <p className="ee-muted" style={{ margin: 0, fontSize: 14 }}>
            O'qituvchi: {exam.teacher_name}
          </p>

          <Facts
            style={{
              margin: '8px 0 0',
              padding: '20px 0',
              borderTop: '1px solid var(--ee-border)',
              borderBottom: '1px solid var(--ee-border)',
            }}
            items={[
              { label: 'Muddat', value: formatShortDateTime(exam.deadline) },
              { label: 'Ajratilgan vaqt', value: examDuration(exam) },
              { label: "O'tish bali", value: `${exam.passing_score ?? 0} / ${exam.total_points}` },
              { label: 'Savollar', value: `${exam.questions_count} ta` },
            ]}
          />

          {state === 'available' && (
            <Flex gap={12} wrap style={{ marginTop: 8 }}>
              <Button
                type="primary"
                className="ee-btn-accent"
                style={{ height: 52, paddingInline: 28, fontSize: 16 }}
                loading={start.isPending}
                disabled={exam.questions_count === 0}
                onClick={onStart}
              >
                Imtihonni boshlash
              </Button>
              <Button style={{ height: 52 }} onClick={() => navigate('/student/exams')}>
                Keyinroq
              </Button>
            </Flex>
          )}
          {state === 'available' && exam.questions_count === 0 && (
            <span className="ee-muted" style={{ fontSize: 13 }}>
              O'qituvchi hali savollarni qo'shmagan.
            </span>
          )}

          {state === 'in_progress' && exam.my_attempt && (
            <Flex gap={16} wrap align="center" style={{ marginTop: 8 }}>
              <Button
                type="primary"
                className="ee-btn-accent"
                style={{ height: 52, paddingInline: 28, fontSize: 16 }}
                onClick={() => navigate(`/student/exams/${exam.id}/take`)}
              >
                Davom ettirish
              </Button>
              <span className="ee-muted">
                Qolgan vaqt:{' '}
                <span className="ee-mono">{formatHms(exam.my_attempt.remaining_seconds)}</span>
              </span>
            </Flex>
          )}

          {state === 'expired' && <ExpiredCard exam={exam} />}
          {(state === 'completed' || state === 'timed_out') && <ClosedAttemptCard exam={exam} />}
        </section>

        <aside
          className="ee-sunken"
          style={{
            flex: '1 1 300px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h2 className="ee-heading" style={{ fontSize: 18 }}>
            Boshlashdan oldin
          </h2>
          <ol
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <Step n={1}>
              {durationSeconds ? (
                <>
                  Boshlaganingizdan so'ng <strong>{formatDuration(exam.duration)}lik taymer</strong>{' '}
                  yoqiladi va uni to'xtatib bo'lmaydi.
                </>
              ) : (
                <>
                  Imtihon vaqti cheklanmagan, lekin <strong>deadline</strong> gacha topshirishingiz
                  kerak.
                </>
              )}
            </Step>
            <Step n={2}>
              Vaqt tugasa yoki deadline o'tsa, javoblarni <strong>yuklay olmaysiz</strong>.
            </Step>
            <Step n={3}>
              Test javoblari va yechim faylini (PDF, Word, rasm) topshirishingiz mumkin.
            </Step>
            <Step n={4} accent>
              Natija darhol <strong>ota-onangizning Telegramiga</strong> yuboriladi.
            </Step>
          </ol>
        </aside>
      </div>
    </Flex>
  )
}

function Step({ n, accent, children }: { n: number; accent?: boolean; children: ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 12 }}>
      <span className={`ee-step${accent ? ' ee-step--accent' : ''}`}>{n}</span>
      <span style={{ fontSize: 14 }}>{children}</span>
    </li>
  )
}

/** Dizayndagi xato kartochkalari (ExamErrors) uchun umumiy qobiq */
function StateCard({
  icon,
  badge,
  title,
  text,
  meta,
  action,
  tone = 'plain',
}: {
  icon: ReactNode
  badge: ReactNode
  title: string
  text: ReactNode
  meta?: ReactNode
  action: ReactNode
  tone?: 'plain' | 'dashed' | 'strong'
}) {
  const border =
    tone === 'dashed'
      ? '1.5px dashed var(--ee-border-strong)'
      : tone === 'strong'
        ? '2px solid var(--ee-text)'
        : undefined
  return (
    <article
      className="ee-panel"
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        border,
        maxWidth: 560,
        marginTop: 8,
      }}
    >
      <Flex justify="space-between" align="center" gap={12}>
        {icon}
        {badge}
      </Flex>
      <h2 style={{ margin: 0, font: '700 18px/24px var(--ee-font)' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14 }}>{text}</p>
      {meta && (
        <p className="ee-muted ee-mono" style={{ margin: 0, fontSize: 13 }}>
          {meta}
        </p>
      )}
      <div style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>{action}</div>
    </article>
  )
}

const svgProps = {
  width: 40,
  height: 40,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const StateIcons = {
  calendar: (
    <svg {...svgProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M10 14l4 4M14 14l-4 4" />
    </svg>
  ),
  clock: (
    <svg {...svgProps}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 2h6" />
    </svg>
  ),
  done: (
    <svg {...svgProps}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8.5 15l2.5 2.5 4.5-5" />
    </svg>
  ),
}

function ExpiredCard({ exam }: { exam: StudentExam }) {
  const navigate = useNavigate()
  return (
    <StateCard
      tone="dashed"
      icon={StateIcons.calendar}
      badge={<Tag variant="warn">Muddati o'tgan</Tag>}
      title="Muddat o'tib ketgan"
      text="Imtihon topshirish muddati (deadline) o'tib ketgan. Imtihonni boshlash imkoniyati mavjud emas."
      meta={`Muddat: ${formatShortDateTime(exam.deadline)}`}
      action={<Button onClick={() => navigate('/student/exams')}>Imtihonlarga qaytish</Button>}
    />
  )
}

/** Urinish yopilgan: topshirilgan bo'lsa — natijaga yo'l, vaqt tugab yopilgan bo'lsa — izoh */
function ClosedAttemptCard({ exam }: { exam: StudentExam }) {
  const navigate = useNavigate()
  const attempt = useMyAttempt(exam.id)

  if (attempt.isPending)
    return <Skeleton active paragraph={{ rows: 3 }} style={{ maxWidth: 560 }} />
  if (attempt.isError) return <QueryError error={attempt.error} onRetry={() => attempt.refetch()} />

  const a = attempt.data
  if (a.is_completed && wasSubmitted(a)) {
    return (
      <StateCard
        icon={StateIcons.done}
        badge={<Tag variant={a.is_passed ? 'pos' : 'neg'}>{a.score ?? 0} ball</Tag>}
        title="Allaqachon topshirilgan"
        text="Siz ushbu imtihonni allaqachon topshirgansiz. Natijangizni ko'rishingiz mumkin."
        meta={`Topshirildi: ${formatShortDateTime(a.finished_at)}`}
        action={
          <Button
            type="primary"
            className="ee-btn-accent"
            onClick={() => navigate(`/student/exams/${exam.id}/result`)}
          >
            Natijani ko'rish
          </Button>
        }
      />
    )
  }

  const total = exam.duration ? durationToSeconds(exam.duration) : 0
  // Backend urinishni hali yopmagan bo'lsa — tugash vaqti: boshlanish + davomiylik (deadline'dan oshmaydi)
  const endedAt =
    a.finished_at ??
    (total
      ? dayjs.min(dayjs(a.started_at).add(total, 'second'), dayjs(exam.deadline)).toISOString()
      : exam.deadline)
  return (
    <StateCard
      tone="strong"
      icon={StateIcons.clock}
      badge={<Timer seconds={0} total={total || 1} />}
      title="Ajratilgan vaqt tugadi"
      text={
        <>
          Imtihon uchun berilgan vaqt{exam.duration ? ` (${examDuration(exam)})` : ''} tugagan.
          Belgilangan vaqtdan keyin javoblarni yuklay olmaysiz.
        </>
      }
      meta={`Boshlangan: ${formatShortDateTime(a.started_at)} · Tugagan: ${formatShortDateTime(endedAt)}`}
      action={
        <Button type="primary" onClick={() => navigate('/student/exams')}>
          Tushunarli
        </Button>
      }
    />
  )
}
