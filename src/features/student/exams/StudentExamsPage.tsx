import { Empty, Flex, Skeleton } from 'antd'
import dayjs from 'dayjs'

import { PageHeader, QueryError } from '@/shared/ui'

import { useStudentExams } from './api'
import { ExamCard } from './ExamCard'
import { getExamState, type StudentExam } from './types'

const byDeadline = (a: StudentExam, b: StudentExam) => dayjs(a.deadline).diff(dayjs(b.deadline))

export function StudentExamsPage() {
  const exams = useStudentExams()

  const header = (
    <PageHeader eyebrow="Imtihonlar" title="Imtihonlarim" subtitle="Guruhlaringizdagi imtihonlar" />
  )
  if (exams.isPending)
    return (
      <>
        {header}
        <Skeleton active paragraph={{ rows: 8 }} />
      </>
    )
  if (exams.isError)
    return (
      <>
        {header}
        <QueryError error={exams.error} onRetry={() => exams.refetch()} />
      </>
    )

  const list = exams.data
  const active = list
    .filter((e) => ['available', 'in_progress'].includes(getExamState(e)))
    .sort(byDeadline)
  // Vaqti tugab yopilgan urinish ham yakunlangan hisoblanadi — uni qayta boshlab bo'lmaydi
  const done = list
    .filter((e) => ['completed', 'timed_out'].includes(getExamState(e)))
    .sort((a, b) => byDeadline(b, a))
  const expired = list.filter((e) => getExamState(e) === 'expired').sort((a, b) => byDeadline(b, a))

  return (
    <>
      {header}
      {list.length === 0 ? (
        <Empty description="Hozircha imtihonlar yo'q" />
      ) : (
        <Flex vertical gap={40}>
          <Section title="Faol" exams={active} empty="Hozircha faol imtihon yo'q" />
          {done.length > 0 && <Section title="Topshirilgan" exams={done} />}
          {expired.length > 0 && <Section title="Muddati o'tgan" exams={expired} />}
        </Flex>
      )}
    </>
  )
}

function Section({ title, exams, empty }: { title: string; exams: StudentExam[]; empty?: string }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 className="ee-heading">
        {title}{' '}
        <span className="ee-muted ee-mono" style={{ fontSize: 15 }}>
          {exams.length}
        </span>
      </h2>
      {exams.length === 0 ? (
        <div className="ee-sunken ee-muted">{empty}</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
            gap: 24,
          }}
        >
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </section>
  )
}
