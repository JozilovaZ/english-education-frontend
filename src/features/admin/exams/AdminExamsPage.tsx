import { Progress, Segmented, Select } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'

import { formatShortDateTime, formatTimeLeft } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { DataTable, PageHeader, Tag, type DataTableColumn } from '@/shared/ui'

import { useAdminAttempts, useAdminExams, useGroups, type AdminExam } from '../api'
import { ExamResultsModal } from './ExamResultsModal'

type Status = 'active' | 'done' | 'off'

const STATUS: Record<Status, string> = {
  active: 'Faol',
  done: 'Yakunlangan',
  off: 'Nofaol',
}

const examStatus = (e: AdminExam): Status =>
  !e.is_active ? 'off' : e.is_expired ? 'done' : 'active'

/** Barcha guruhlar imtihonlari (faqat ko'rish: imtihonni va natijalarni o'qituvchi boshqaradi) */
export function AdminExamsPage() {
  const exams = useAdminExams()
  const attempts = useAdminAttempts()
  const groups = useGroups()
  const [params, setParams] = useUrlState()
  const [open, setOpen] = useState<AdminExam | null>(null)

  const all = exams.data ?? []
  const status = (params.get('status') ?? '') as Status | ''
  const groupId = Number(params.get('group')) || 0
  const search = (params.get('search') ?? '').toLowerCase()

  const groupSize = new Map((groups.data ?? []).map((g) => [g.id, g.active_students_count]))
  const groupOptions = [...new Map(all.map((e) => [e.group, e.group_name]))]

  // Har bir imtihon bo'yicha: nechta talaba yakunladi va nechtasi o'tdi
  const stats = new Map<number, { done: number; passed: number }>()
  for (const a of attempts.data ?? []) {
    if (!a.is_completed) continue
    const s = stats.get(a.exam) ?? { done: 0, passed: 0 }
    s.done++
    if (a.is_passed) s.passed++
    stats.set(a.exam, s)
  }

  const base = all.filter(
    (e) =>
      (!groupId || e.group === groupId) &&
      (!search ||
        [e.name, e.group_name, e.teacher_name ?? ''].some((v) => v.toLowerCase().includes(search))),
  )
  const count = (s: Status) => base.filter((e) => examStatus(e) === s).length
  // Faollari muddati yaqinlashgani bo'yicha, qolganlari eng yangisi birinchi
  const rows = base
    .filter((e) => !status || examStatus(e) === status)
    .sort((a, b) => {
      const sa = examStatus(a) === 'active'
      const sb = examStatus(b) === 'active'
      if (sa !== sb) return sa ? -1 : 1
      return sa
        ? dayjs(a.deadline).diff(dayjs(b.deadline))
        : dayjs(b.deadline).diff(dayjs(a.deadline))
    })

  const columns: DataTableColumn<AdminExam>[] = [
    {
      title: 'Imtihon',
      key: 'name',
      render: (_, e) => (
        <span style={{ display: 'block', minWidth: 200 }}>
          <strong style={{ display: 'block' }}>{e.name}</strong>
          <span className="ee-muted" style={{ fontSize: 13 }}>
            {e.group_name} · {e.teacher_name}
          </span>
        </span>
      ),
    },
    {
      title: 'Muddat',
      key: 'deadline',
      render: (_, e) => {
        const left = examStatus(e) === 'active' ? formatTimeLeft(e.deadline) : null
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            <span className="ee-num" style={{ display: 'block' }}>
              {formatShortDateTime(e.deadline)}
            </span>
            {left && (
              <span className="ee-muted" style={{ fontSize: 12 }}>
                {left}
              </span>
            )}
          </span>
        )
      },
    },
    {
      title: 'Savollar',
      key: 'questions',
      render: (_, e) => (
        <span className="ee-num" style={{ whiteSpace: 'nowrap' }}>
          {e.questions_count} ta · {e.total_points} ball
          <span className="ee-muted" style={{ display: 'block', fontSize: 12 }}>
            o'tish bali {e.passing_score ?? 0}
          </span>
        </span>
      ),
    },
    {
      title: 'Topshirdi',
      key: 'done',
      render: (_, e) => {
        const s = stats.get(e.id) ?? { done: 0, passed: 0 }
        const size = groupSize.get(e.group)
        return (
          <span style={{ display: 'block', minWidth: 120 }}>
            <span className="ee-num">
              {s.done}
              {size !== undefined && <span className="ee-muted"> / {size}</span>}
            </span>
            {size ? (
              <Progress
                percent={Math.min(100, Math.round((s.done / size) * 100))}
                showInfo={false}
                size="small"
                style={{ margin: 0 }}
              />
            ) : null}
          </span>
        )
      },
    },
    {
      title: "O'tdi",
      key: 'passed',
      render: (_, e) => {
        const s = stats.get(e.id)
        return s?.done ? (
          <span className="ee-num">
            {s.passed}{' '}
            <span className="ee-muted" style={{ fontSize: 12 }}>
              ({Math.round((s.passed / s.done) * 100)}%)
            </span>
          </span>
        ) : (
          <span className="ee-muted">—</span>
        )
      },
    },
    {
      title: 'Holati',
      key: 'status',
      render: (_, e) => {
        const s = examStatus(e)
        return (
          <Tag variant={s === 'active' ? 'prog' : s === 'done' ? 'warn' : 'neu'}>{STATUS[s]}</Tag>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={`${all.length} ta imtihon`}
        title="Imtihonlar"
        subtitle="Imtihonlarni guruh o'qituvchisi yaratadi va baholaydi. Natijalarni ko'rish uchun imtihonni bosing"
      />

      {/* Holat bo'yicha tez saralash */}
      <Segmented
        style={{ marginBottom: 16 }}
        value={status}
        onChange={(v) => setParams({ status: v || null })}
        options={[
          { value: '', label: `Hammasi · ${base.length}` },
          ...(Object.keys(STATUS) as Status[])
            .filter((s) => count(s) > 0 || s === status)
            .map((s) => ({ value: s, label: `${STATUS[s]} · ${count(s)}` })),
        ]}
      />

      <DataTable<AdminExam>
        columns={columns}
        data={rows}
        loading={exams.isFetching}
        error={exams.error}
        onRetry={() => void exams.refetch()}
        searchPlaceholder="Imtihon, guruh yoki o'qituvchi"
        emptyText={all.length ? 'Imtihon topilmadi' : "Hali imtihon yo'q"}
        onRow={(e) => ({ onClick: () => setOpen(e), style: { cursor: 'pointer' } })}
        filters={
          groupOptions.length > 1 && (
            <Select
              aria-label="Guruh"
              value={groupId}
              onChange={(v) => setParams({ group: v || null })}
              style={{ width: 200 }}
              showSearch
              optionFilterProp="label"
              options={[
                { value: 0, label: 'Barcha guruhlar' },
                ...groupOptions.map(([value, label]) => ({ value, label })),
              ]}
            />
          )
        }
      />

      <ExamResultsModal
        exam={open}
        attempts={(attempts.data ?? []).filter((a) => a.exam === open?.id)}
        onClose={() => setOpen(null)}
      />
    </>
  )
}
