import { useQuery } from '@tanstack/react-query'
import { Empty, Flex, Segmented, Skeleton } from 'antd'
import dayjs from 'dayjs'

import type { Attendance, StatusF1cEnum } from '@/shared/api/generated/model'
import { customInstance } from '@/shared/api/mutator'
import { formatShortDateTime } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { QueryError, StatRow, STATUS_MAPS, StatTile, StatusTag } from '@/shared/ui'

interface MyAttendance {
  statistics: Record<'total_lessons' | StatusF1cEnum, number>
  records: Attendance[]
}

function useMyAttendance() {
  return useQuery({
    queryKey: ['student', 'attendance'],
    queryFn: () =>
      customInstance<MyAttendance>({ url: '/Attendance/my-attendance/', method: 'GET' }),
  })
}

const STATUSES: StatusF1cEnum[] = ['present', 'late', 'absent', 'excused']

/** Davomatim: qatnashish foizi, holatlar bo'yicha sonlar va darslar ro'yxati */
export function StudentAttendancePage() {
  const query = useMyAttendance()
  const [params, setParams] = useUrlState()

  if (query.isPending) return <Skeleton active paragraph={{ rows: 8 }} />
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} />

  const { statistics: s, records } = query.data
  const total = s.total_lessons
  // Backend foizida kechikkan "kelmagan" hisoblanadi. Biz: kechikkan ham darsda bo'lgan,
  // sababli darslar esa foizga kirmaydi
  const counted = total - s.excused
  const rate = counted > 0 ? Math.round(((s.present + s.late) / counted) * 100) : null

  const status = (params.get('status') ?? '') as StatusF1cEnum | ''
  const list = records
    .filter((r) => !status || r.status === status)
    .sort((a, b) => dayjs(b.marked_at).diff(dayjs(a.marked_at)))

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={6}>
        <span className="ee-eyebrow">{total} ta dars belgilangan</span>
        <h1 className="ee-title">Davomatim</h1>
      </Flex>

      {/* Asosiy ko'rsatkich — amber, e'tibor kerak (kelmagan) — to'q */}
      <StatRow min={150}>
        <StatTile
          label="Qatnashish"
          value={rate === null ? '—' : `${rate}%`}
          suffix={counted > 0 ? `${s.present + s.late} / ${counted}` : undefined}
          tone="accent"
        />
        {STATUSES.map((st) => (
          <StatTile
            key={st}
            label={STATUS_MAPS.attendance[st].label}
            value={s[st]}
            tone={st === 'absent' && s[st] > 0 ? 'ink' : 'plain'}
          />
        ))}
      </StatRow>
      <span className="ee-muted" style={{ fontSize: 13, marginTop: -12 }}>
        Kechikkan darslar qatnashgan hisoblanadi, sababli darslar foizga kirmaydi.
      </span>

      {records.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Hali davomat belgilanmagan" />
        </div>
      ) : (
        <>
          {/* Telefonda tugmalar sig'masa yonga suriladi */}
          <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <Segmented
              value={status}
              onChange={(v) => setParams({ status: v || null })}
              options={[
                { value: '', label: 'Hammasi' },
                ...STATUSES.map((st) => ({
                  value: st,
                  label: `${STATUS_MAPS.attendance[st].label} · ${s[st]}`,
                })),
              ]}
            />
          </div>
          <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="ee-table ee-table--compact">
              <thead>
                <tr>
                  <th>Dars</th>
                  <th>Holati</th>
                  <th>Izoh</th>
                  <th>Belgilangan</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td style={{ minWidth: 160 }}>
                      <strong>{r.lesson_title}</strong>
                      <div className="ee-muted" style={{ fontSize: 13 }}>
                        {r.group_name}
                      </div>
                    </td>
                    <td>
                      <StatusTag kind="attendance" value={r.status} />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      {r.note || <span className="ee-muted">—</span>}
                    </td>
                    <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                      {formatShortDateTime(r.marked_at)}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={4} className="ee-muted" style={{ textAlign: 'center' }}>
                      Bu holatda dars yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Flex>
  )
}
