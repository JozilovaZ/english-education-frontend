import { Button, Flex, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router'

import { useAuthStore } from '@/features/auth/store'
import { useHomeworkList } from '@/shared/api/generated/endpoints/homeworks/homeworks'
import { listItems } from '@/shared/api/list'
import { formatDuration, formatShortDateTime } from '@/shared/lib/format'
import { QueryError } from '@/shared/ui'
import { Facts, ScoreBar } from '@/shared/ui/exam'

import { useStudentExams } from './exams/api'
import { ExamCard } from './exams/ExamCard'
import { examDuration } from './exams/examMeta'
import { getExamState, type StudentExam } from './exams/types'

/** Talaba bosh sahifasi — dizayndagi "Talaba · Bosh sahifa" */
export function StudentHomePage() {
  const user = useAuthStore((s) => s.user)
  const exams = useStudentExams()
  // Backend hozircha talabaga barcha guruhlarning uy vazifalarini qaytaradi (BACKEND_ISSUES #3, #7)
  const homework = useHomeworkList({ query: { select: (data) => listItems(data) } })

  if (exams.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (exams.isError) return <QueryError error={exams.error} onRetry={() => exams.refetch()} />

  const now = dayjs()
  const list = exams.data
  const open = list
    .filter((e) => ['available', 'in_progress'].includes(getExamState(e)))
    // Davom etayotgan imtihon birinchi, keyin eng yaqin deadline
    .sort(
      (a, b) =>
        Number(getExamState(b) === 'in_progress') - Number(getExamState(a) === 'in_progress') ||
        dayjs(a.deadline).diff(dayjs(b.deadline)),
    )
  const featured = open[0]
  // Qolgan faol imtihonlar, keyin oxirgi topshirilganlari (muddati o'tganlari ko'rsatilmaydi)
  const others = [
    ...open.slice(1),
    ...list
      .filter((e) => getExamState(e) === 'completed')
      .sort((a, b) => dayjs(b.my_attempt?.finished_at).diff(dayjs(a.my_attempt?.finished_at))),
  ].slice(0, 4)

  const pendingHomework = (homework.data ?? []).filter(
    (h) => !h.my_submission && dayjs(h.deadline).isAfter(now),
  )
  const deadlines = [
    ...pendingHomework.map((h) => ({
      key: `h${h.id}`,
      title: h.title,
      meta: `Uy vazifasi · ${h.max_score ?? 100} ball`,
      deadline: h.deadline,
      to: `/student/homework?id=${h.id}`,
    })),
    ...open.map((e) => ({
      key: `e${e.id}`,
      title: e.name,
      meta: `Imtihon · ${e.duration ? formatDuration(e.duration) : 'vaqt cheklanmagan'}`,
      deadline: e.deadline,
      to: `/student/exams/${e.id}`,
    })),
  ]
    .sort((a, b) => dayjs(a.deadline).diff(dayjs(b.deadline)))
    .slice(0, 5)

  const lastResult = list
    .filter((e) => e.my_attempt?.is_completed)
    .sort((a, b) => dayjs(b.my_attempt?.finished_at).diff(dayjs(a.my_attempt?.finished_at)))[0]

  const groups = [...new Set(list.map((e) => e.group_name))].join(' · ')
  const summary = [
    open.length ? `${open.length} ta faol imtihon` : null,
    pendingHomework.length ? `${pendingHomework.length} ta topshirilmagan uy vazifasi` : null,
  ].filter(Boolean)

  return (
    <Flex vertical gap={32}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groups && <span className="ee-eyebrow">{groups}</span>}
        <h1 className="ee-display">Salom, {user?.firstName || user?.username}</h1>
        <p className="ee-muted" style={{ margin: 0, fontSize: 16 }}>
          {summary.length
            ? `Sizda ${summary.join(' va ')} bor.`
            : "Hozircha bajarilmagan ish yo'q."}
        </p>
      </section>

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
            <FeaturedExam exam={featured} />
          ) : (
            <div className="ee-sunken">
              <h2 className="ee-heading">Faol imtihon yo'q</h2>
              <p className="ee-muted" style={{ margin: '4px 0 0' }}>
                O'qituvchi yangi imtihon e'lon qilganda shu yerda ko'rinadi.
              </p>
            </div>
          )}

          {others.length > 0 && (
            <>
              <Flex justify="space-between" align="baseline" gap={16}>
                <h2 className="ee-heading">Boshqa imtihonlar</h2>
                <Link to="/student/exams" style={{ fontWeight: 700, fontSize: 14 }}>
                  Barchasi
                </Link>
              </Flex>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                  gap: 24,
                }}
              >
                {others.map((e) => (
                  <ExamCard key={e.id} exam={e} />
                ))}
              </div>
            </>
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
            <h2 className="ee-heading">Yaqin muddatlar</h2>
            {homework.isPending ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : deadlines.length === 0 ? (
              <span className="ee-muted" style={{ fontSize: 14 }}>
                Yaqin muddatli ish yo'q.
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

          {lastResult?.my_attempt && (
            <section
              className="ee-panel"
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <span className="ee-eyebrow">Oxirgi natija · {lastResult.name}</span>
              <ScoreBar
                score={lastResult.my_attempt.score}
                total={lastResult.total_points}
                passing={lastResult.passing_score ?? 0}
                passed={lastResult.my_attempt.is_passed}
              />
              <Link
                to={`/student/exams/${lastResult.id}/result`}
                style={{ fontSize: 14, fontWeight: 700 }}
              >
                Batafsil ko'rish
              </Link>
            </section>
          )}
        </aside>
      </div>
    </Flex>
  )
}

/** Ink fonli katta blok — eng muhim (davom etayotgan yoki eng yaqin) imtihon */
function FeaturedExam({ exam }: { exam: StudentExam }) {
  const navigate = useNavigate()
  const inProgress = getExamState(exam) === 'in_progress'
  return (
    <article className="ee-inverse" style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <div
        style={{
          flex: '999 1 320px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span
          className="ee-tag"
          style={{
            alignSelf: 'flex-start',
            background: 'var(--ee-accent)',
            color: 'var(--ee-on-accent)',
          }}
        >
          {inProgress ? 'Davom etmoqda' : 'Faol imtihon'}
        </span>
        <h2
          style={{
            margin: 0,
            font: '600 32px/38px var(--ee-font-serif)',
            overflowWrap: 'anywhere',
          }}
        >
          {exam.name}
        </h2>
        {exam.description && (
          <p style={{ margin: 0, opacity: 0.8, whiteSpace: 'pre-line' }}>{exam.description}</p>
        )}
        <Facts
          style={{ marginTop: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}
          items={[
            { label: 'Muddat', value: formatShortDateTime(exam.deadline) },
            { label: 'Vaqt', value: examDuration(exam) },
            { label: "O'tish bali", value: `${exam.passing_score ?? 0} / ${exam.total_points}` },
            { label: 'Savollar', value: `${exam.questions_count} ta` },
          ]}
        />
      </div>
      <div
        style={{
          flex: '1 1 200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, opacity: 0.8 }}>
          {exam.teacher_name} · {exam.group_name}
        </span>
        <Button
          type="primary"
          className="ee-btn-accent"
          style={{ height: 44 }}
          onClick={() =>
            navigate(inProgress ? `/student/exams/${exam.id}/take` : `/student/exams/${exam.id}`)
          }
        >
          {inProgress ? 'Davom ettirish' : "Imtihonga o'tish"}
        </Button>
      </div>
    </article>
  )
}
