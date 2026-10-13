import {
  AppstoreOutlined,
  CalendarOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Empty, Flex, Input, Progress, Segmented, Select, Skeleton } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { Group, Schedule } from '@/shared/api/generated/model'
import { formatDate } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import {
  DataTable,
  PageHeader,
  QueryError,
  STATUS_MAPS,
  StatusTag,
  useFormDrawer,
  type DataTableColumn,
} from '@/shared/ui'

import { useGroups, useSchedules } from '../api'
import { scheduleSummary } from '../schedules/scheduleMeta'
import { GroupDrawer } from './GroupDrawer'
import { isClosedGroup } from './groupMeta'

/** Sig'im: faol talabalar / o'rinlar */
export function Capacity({ group, wide }: { group: Group; wide?: boolean }) {
  const capacity = group.capacity ?? 0
  const count = group.active_students_count
  const full = capacity > 0 && count >= capacity
  const free = Math.max(capacity - count, 0)
  return (
    <Flex vertical gap={4} style={{ minWidth: 120, width: wide ? '100%' : undefined }}>
      <Flex justify="space-between" gap={8} style={{ fontSize: 13 }}>
        <span className="ee-num">
          <strong>{count}</strong> / {capacity}
        </span>
        <span className="ee-muted">{full ? "to'lgan" : `${free} bo'sh o'rin`}</span>
      </Flex>
      <Progress
        percent={capacity ? (count / capacity) * 100 : 0}
        showInfo={false}
        size="small"
        strokeColor="var(--ee-accent)"
        aria-label="Sig'im"
      />
    </Flex>
  )
}

const STATUS_ORDER = ['active', 'recruiting', 'paused', 'completed', 'cancelled'] as const
type View = 'cards' | 'table'

const initials = (name?: string | null) =>
  (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export function GroupsPage() {
  const groups = useGroups()
  const schedules = useSchedules()
  const drawer = useFormDrawer<Group>({ openOnNew: true })
  const navigate = useNavigate()
  const [params, setParams] = useUrlState()
  // ?new=1&course=ID — Kurslar sahifasidan: forma shu kurs tanlangan holda ochiladi
  const [presetCourse] = useState(() => Number(params.get('course')) || undefined)
  useEffect(() => {
    if (presetCourse) setParams({ course: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat birinchi ochilishda
  }, [])

  const status = params.get('status') ?? ''
  const teacher = Number(params.get('teacher')) || 0
  const seats = params.get('seats') ?? ''
  const search = params.get('search') ?? ''
  const view: View = params.get('view') === 'table' ? 'table' : 'cards'

  const teacherOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const g of groups.data ?? []) map.set(g.teacher, g.teacher_name ?? '—')
    return [...map].map(([value, label]) => ({ value, label }))
  }, [groups.data])

  const scheduleByGroup = useMemo(() => {
    const map = new Map<number, Schedule[]>()
    for (const s of schedules.data ?? []) map.set(s.group, [...(map.get(s.group) ?? []), s])
    return map
  }, [schedules.data])

  const all = groups.data ?? []
  // Holat tugmalaridagi sonlar boshqa filtrlar hisobga olingan holda
  const base = all.filter(
    (g) =>
      (!teacher || g.teacher === teacher) &&
      (!seats || (seats === 'free') === g.available_seats > 0) &&
      (!search ||
        [g.name, g.course_name, g.teacher_name].some((v) =>
          v?.toLowerCase().includes(search.toLowerCase()),
        )),
  )
  const rows = base.filter((g) => !status || g.status === status)
  const count = (s: string) => base.filter((g) => g.status === s).length

  const columns: DataTableColumn<Group>[] = [
    {
      title: 'Guruh',
      key: 'name',
      render: (_, g) => (
        <Link to={`/admin/groups/${g.id}`} className="ee-row-title">
          {g.name}
        </Link>
      ),
    },
    { title: 'Kurs', dataIndex: 'course_name' },
    { title: "O'qituvchi", dataIndex: 'teacher_name', render: (v?: string) => v || '—' },
    {
      title: 'Dars kunlari',
      key: 'schedule',
      render: (_, g) => {
        const lines = scheduleSummary(scheduleByGroup.get(g.id) ?? [])
        return lines.length ? (
          lines.map((l) => (
            <div key={l} className="ee-num" style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
              {l}
            </div>
          ))
        ) : (
          <span className="ee-muted">—</span>
        )
      },
    },
    { title: 'Talabalar', key: 'capacity', render: (_, g) => <Capacity group={g} /> },
    {
      title: 'Holati',
      dataIndex: 'status',
      render: (v: string) => <StatusTag kind="group" value={v} />,
    },
  ]

  const filters = (
    <>
      <Select
        aria-label="O'qituvchi"
        value={teacher}
        onChange={(v) => setParams({ teacher: v || null })}
        style={{ width: 200 }}
        showSearch
        optionFilterProp="label"
        options={[{ value: 0, label: "Barcha o'qituvchilar" }, ...teacherOptions]}
      />
      <Select
        aria-label="Bo'sh o'rin"
        value={seats}
        onChange={(v) => setParams({ seats: v || null })}
        style={{ width: 170 }}
        options={[
          { value: '', label: "Barcha o'rinlar" },
          { value: 'free', label: "Bo'sh o'rin bor" },
          { value: 'full', label: "To'lgan" },
        ]}
      />
    </>
  )
  const viewToggle = (
    <Segmented<View>
      style={{ marginLeft: 'auto' }}
      value={view}
      onChange={(v) => setParams({ view: v === 'cards' ? null : v })}
      options={[
        { value: 'cards', icon: <AppstoreOutlined />, title: 'Kartochkalar' },
        { value: 'table', icon: <TableOutlined />, title: 'Jadval' },
      ]}
    />
  )

  return (
    <>
      <PageHeader
        eyebrow={`${all.length} ta guruh · ${all.reduce((s, g) => s + g.active_students_count, 0)} ta o'quvchi`}
        title="Guruhlar"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={drawer.openCreate}
          >
            Guruh yaratish
          </Button>
        }
      />

      {/* Holat bo'yicha tez saralash */}
      <Segmented
        style={{ marginBottom: 16 }}
        value={status}
        onChange={(v) => setParams({ status: v || null })}
        options={[
          { value: '', label: `Hammasi · ${base.length}` },
          ...STATUS_ORDER.filter((s) => count(s) > 0 || s === status).map((s) => ({
            value: s,
            label: `${STATUS_MAPS.group[s].label} · ${count(s)}`,
          })),
        ]}
      />

      {view === 'cards' && (
        <Flex gap={8} wrap align="center" style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: 'var(--ee-text-3)' }} />}
            placeholder="Guruh, kurs yoki o'qituvchi"
            value={search}
            onChange={(e) => setParams({ search: e.target.value || null })}
            style={{ flex: '1 1 240px', maxWidth: 320 }}
          />
          {filters}
          {viewToggle}
        </Flex>
      )}

      {groups.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : groups.isError ? (
        <QueryError error={groups.error} onRetry={() => groups.refetch()} />
      ) : view === 'table' ? (
        <DataTable<Group>
          columns={columns}
          data={rows}
          loading={groups.isFetching}
          error={groups.error}
          onRetry={() => void groups.refetch()}
          searchPlaceholder="Guruh, kurs yoki o'qituvchi"
          emptyText="Guruh topilmadi"
          onRow={(g) => ({
            onClick: (e) => {
              // Havola yoki tugma bosilganda ikki marta o'tmaslik uchun
              if ((e.target as HTMLElement).closest('a, button')) return
              navigate(`/admin/groups/${g.id}`)
            },
            style: { cursor: 'pointer' },
          })}
          filters={
            <>
              {filters}
              {viewToggle}
            </>
          }
        />
      ) : rows.length === 0 ? (
        <div className="ee-panel">
          <Empty description={all.length ? "Filtr bo'yicha guruh topilmadi" : "Hali guruh yo'q"}>
            {!all.length && (
              <Button type="primary" icon={<PlusOutlined />} onClick={drawer.openCreate}>
                Birinchi guruhni yaratish
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <div className="ee-group-grid">
          {rows.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              schedule={scheduleSummary(scheduleByGroup.get(g.id) ?? [])}
              onEdit={() => drawer.openEdit(g)}
            />
          ))}
          <button type="button" className="ee-group-new" onClick={drawer.openCreate}>
            <PlusOutlined />
            Yangi guruh
          </button>
        </div>
      )}

      <GroupDrawer
        open={drawer.open}
        group={drawer.record}
        onClose={drawer.close}
        onSaved={(g) => !drawer.isEdit && navigate(`/admin/groups/${g.id}`)}
        defaultCourse={presetCourse}
      />
    </>
  )
}

function GroupCard({
  group: g,
  schedule,
  onEdit,
}: {
  group: Group
  schedule: string[]
  onEdit: () => void
}) {
  const closed = isClosedGroup(g)
  return (
    <article className="ee-panel ee-group-card">
      <Link to={`/admin/groups/${g.id}`} className="ee-group-card__link" aria-label={g.name} />
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div style={{ minWidth: 0 }}>
          <h2 className="ee-group-card__title">{g.name}</h2>
          <span className="ee-muted" style={{ fontSize: 13 }}>
            {g.course_name}
          </span>
        </div>
        <Flex align="center" gap={4} style={{ position: 'relative', zIndex: 1 }}>
          <StatusTag kind="group" value={g.status} />
          {!closed && (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [{ key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash' }],
                onClick: onEdit,
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Amallar" />
            </Dropdown>
          )}
        </Flex>
      </Flex>

      <Flex align="center" gap={10}>
        <span className="ee-avatar ee-avatar--sm">{initials(g.teacher_name)}</span>
        <span style={{ fontSize: 13 }}>
          <span className="ee-muted" style={{ display: 'block', fontSize: 11 }}>
            O'qituvchi
          </span>
          <strong>{g.teacher_name ?? '—'}</strong>
        </span>
      </Flex>

      <div className="ee-group-card__schedule">
        <CalendarOutlined />
        {schedule.length ? (
          <span>
            {schedule.map((l) => (
              <span key={l} className="ee-num" style={{ display: 'block' }}>
                {l}
              </span>
            ))}
          </span>
        ) : (
          <span className="ee-muted">Jadval tuzilmagan</span>
        )}
      </div>

      <Capacity group={g} wide />

      <span className="ee-muted" style={{ fontSize: 12 }}>
        Boshlangan: <span className="ee-num">{formatDate(g.start_date)}</span>
      </span>
    </article>
  )
}
