import { Button, Empty, Segmented, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router'

import { formatShortDateTime } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { PageHeader, QueryError, StatRow, StatTile, Tag } from '@/shared/ui'

import { useStudentHomework } from '../homework/api'
import { useStudentExams } from './api'

type Tab = 'exams' | 'homework'

/** O'rtacha foiz: har bir ishda to'plangan ball / maksimal ball */
const avgPercent = (items: { score: number; max: number }[]) =>
  items.length
    ? Math.round(items.reduce((s, i) => s + (i.score / Math.max(1, i.max)) * 100, 0) / items.length)
    : null

/** Barcha baholar: imtihon natijalari va uy vazifasi baholari */
export function StudentResultsPage() {
  const navigate = useNavigate()
  const exams = useStudentExams()
  const homework = useStudentHomework()
  const [params, setParams] = useUrlState()
  const tab: Tab = params.get('tab') === 'homework' ? 'homework' : 'exams'

  const header = (
    <PageHeader
      eyebrow="Natijalar"
      title="Mening baholarim"
      subtitle="Imtihon natijalari va o'qituvchi baholagan uy vazifalari"
    />
  )
  if (exams.isPending)
    return (
      <>
        {header}
        <Skeleton active paragraph={{ rows: 6 }} />
      </>
    )
  if (exams.isError)
    return (
      <>
        {header}
        <QueryError error={exams.error} onRetry={() => exams.refetch()} />
      </>
    )

  const rows = exams.data
    .filter((e) => e.my_attempt?.is_completed)
    .sort((a, b) => dayjs(b.my_attempt?.finished_at).diff(dayjs(a.my_attempt?.finished_at)))
  const passed = rows.filter((e) => e.my_attempt?.is_passed).length
  const examAvg = avgPercent(
    rows.map((e) => ({ score: e.my_attempt?.score ?? 0, max: e.total_points })),
  )

  const graded = (homework.data ?? [])
    .filter((h) => h.my_submission?.is_graded)
    .sort((a, b) => dayjs(b.my_submission?.submitted_at).diff(dayjs(a.my_submission?.submitted_at)))
  const hwAvg = avgPercent(
    graded.map((h) => ({ score: h.my_submission?.score ?? 0, max: h.max_score ?? 100 })),
  )

  return (
    <>
      {header}

      <StatRow>
        <StatTile label="Topshirilgan imtihonlar" value={rows.length} />
        <StatTile
          label="O'tgan imtihonlar"
          value={passed}
          suffix={rows.length ? `/ ${rows.length}` : undefined}
          tone="accent"
        />
        <StatTile
          label="Imtihonlarda o'rtacha"
          value={examAvg ?? '—'}
          suffix={examAvg !== null ? '%' : undefined}
        />
        <StatTile
          label="Uy vazifalarida o'rtacha"
          value={hwAvg ?? '—'}
          suffix={hwAvg !== null ? '%' : undefined}
        />
      </StatRow>

      <Segmented<Tab>
        style={{ margin: '24px 0 16px' }}
        value={tab}
        onChange={(v) => setParams({ tab: v === 'exams' ? null : v })}
        options={[
          { value: 'exams', label: `Imtihonlar · ${rows.length}` },
          { value: 'homework', label: `Uy vazifalari · ${graded.length}` },
        ]}
      />

      {tab === 'exams' ? (
        rows.length === 0 ? (
          <div className="ee-panel">
            <Empty description="Hali topshirilgan imtihon yo'q" />
          </div>
        ) : (
          <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="ee-table">
              <thead>
                <tr>
                  <th>Imtihon</th>
                  <th>Topshirildi</th>
                  <th style={{ textAlign: 'right' }}>Ball</th>
                  <th>Holati</th>
                  <th aria-label="Harakatlar" />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const a = e.my_attempt!
                  return (
                    <tr
                      key={e.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/student/exams/${e.id}/result`)}
                    >
                      <td>
                        <strong>{e.name}</strong>
                        <div className="ee-muted" style={{ fontSize: 13 }}>
                          {e.group_name} · {e.teacher_name}
                        </div>
                      </td>
                      <td className="ee-num" style={{ whiteSpace: 'nowrap' }}>
                        {formatShortDateTime(a.finished_at)}
                      </td>
                      <td className="ee-num" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <strong>{a.score}</strong> / {e.total_points}
                      </td>
                      <td>
                        <Tag variant={a.is_passed ? 'pos' : 'neg'}>
                          {a.is_passed ? "O'tdi" : "O'ta olmadi"}
                        </Tag>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button type="link" style={{ fontWeight: 700 }}>
                          Batafsil
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : graded.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Hali baholangan uy vazifasi yo'q" />
        </div>
      ) : (
        <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ee-table">
            <thead>
              <tr>
                <th>Uy vazifasi</th>
                <th>Topshirildi</th>
                <th style={{ textAlign: 'right' }}>Ball</th>
                <th>O'qituvchi izohi</th>
              </tr>
            </thead>
            <tbody>
              {graded.map((h) => {
                const s = h.my_submission!
                return (
                  <tr
                    key={h.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/student/homework?id=${h.id}`)}
                  >
                    <td>
                      <strong>{h.title}</strong>
                    </td>
                    <td className="ee-num" style={{ whiteSpace: 'nowrap' }}>
                      {formatShortDateTime(s.submitted_at)}
                    </td>
                    <td className="ee-num" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <strong>{s.score ?? 0}</strong> / {h.max_score ?? 100}
                    </td>
                    <td className="ee-muted" style={{ fontSize: 13, maxWidth: 320 }}>
                      {s.teacher_comment || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
