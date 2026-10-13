import {
  CalendarOutlined,
  CloseOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Empty, Flex, Grid, Modal, Popover, Segmented, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { useMemo, useState, type ReactNode } from 'react'

import type { DayOfWeekEnum, Group, Schedule } from '@/shared/api/generated/model'
import { formatTime } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { PageHeader, QueryError } from '@/shared/ui'

import { useGroups, useSchedules } from '../api'
import { LessonCard } from './LessonCard'
import { ScheduleDrawer } from './ScheduleDrawer'
import { DAYS, findConflicts } from './scheduleMeta'

const TODAY_INDEX = (new Date().getDay() + 6) % 7
/** Haftalik to'rda bir soat balandligi (px) */
const HOUR = 64

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const fromMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`

type View = 'week' | 'list'

interface DrawerState {
  open: boolean
  schedule: Schedule | null
  preset?: Partial<Pick<Schedule, 'day_of_week' | 'start_time' | 'end_time'>>
}

/** Dars jadvali: haftalik to'r (soatlar × kunlar), ro'yxat, telefonda — kun bo'yicha */
export function SchedulesPage() {
  const schedules = useSchedules()
  const groups = useGroups()
  const screens = Grid.useBreakpoint()
  const [params, setParams] = useUrlState()
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, schedule: null })
  const [mobileDay, setMobileDay] = useState(TODAY_INDEX)
  const [detail, setDetail] = useState<Schedule | null>(null)

  const groupId = Number(params.get('group')) || 0
  const room = params.get('room') ?? ''
  const teacher = Number(params.get('teacher')) || 0
  const onlyConflicts = params.get('conflicts') === '1'
  const view: View = params.get('view') === 'list' ? 'list' : 'week'
  const isPhone = !screens.md

  const groupById = useMemo(() => new Map((groups.data ?? []).map((g) => [g.id, g])), [groups.data])

  if (schedules.isPending || groups.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (schedules.isError)
    return <QueryError error={schedules.error} onRetry={() => schedules.refetch()} />
  if (groups.isError) return <QueryError error={groups.error} onRetry={() => groups.refetch()} />

  const all = schedules.data
  const rooms = [...new Set(all.map((s) => s.room?.trim()).filter(Boolean))].sort() as string[]
  const teachers = new Map<number, string>()
  for (const g of groups.data) teachers.set(g.teacher, g.teacher_name ?? '—')

  const conflictIds = new Set(
    all.filter((s) => findConflicts(all, s, s.id).length).map((s) => s.id),
  )
  const shown = all.filter(
    (s) =>
      (!groupId || s.group === groupId) &&
      (!room || s.room?.trim() === room) &&
      (!teacher || groupById.get(s.group)?.teacher === teacher) &&
      (!onlyConflicts || conflictIds.has(s.id)),
  )
  const filtered = Boolean(groupId || room || teacher || onlyConflicts)
  const weeklyMinutes = all.reduce((sum, s) => sum + toMin(s.end_time) - toMin(s.start_time), 0)

  const openCreate = (preset?: DrawerState['preset']) =>
    setDrawer({ open: true, schedule: null, preset })
  const openEdit = (s: Schedule) => setDrawer({ open: true, schedule: s })
  // Darsni bosganda — avval batafsil kartochka (tahrirlash, guruh, o'chirish shu yerdan)
  const card = (s: Schedule, close: () => void) => (
    <LessonCard
      schedule={s}
      group={groupById.get(s.group)}
      all={all}
      onEdit={() => openEdit(s)}
      onClose={close}
    />
  )

  return (
    <>
      <PageHeader
        eyebrow={`Haftada ${all.length} ta dars · ${Math.round(weeklyMinutes / 60)} soat · ${rooms.length} ta xona`}
        title="Dars jadvali"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={() => openCreate()}
          >
            Dars qo'shish
          </Button>
        }
      />

      <Flex gap={8} wrap align="center" style={{ marginBottom: 16 }}>
        {!isPhone && (
          <Segmented<View>
            value={view}
            onChange={(v) => setParams({ view: v === 'week' ? null : v })}
            options={[
              { value: 'week', label: 'Hafta', icon: <CalendarOutlined /> },
              { value: 'list', label: "Ro'yxat", icon: <UnorderedListOutlined /> },
            ]}
          />
        )}
        <Select
          aria-label="Guruh"
          value={groupId}
          onChange={(v) => setParams({ group: v || null })}
          style={{ width: 190 }}
          showSearch
          optionFilterProp="label"
          options={[
            { value: 0, label: 'Barcha guruhlar' },
            ...groups.data.map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
        <Select
          aria-label="O'qituvchi"
          value={teacher}
          onChange={(v) => setParams({ teacher: v || null })}
          style={{ width: 190 }}
          showSearch
          optionFilterProp="label"
          options={[
            { value: 0, label: "Barcha o'qituvchilar" },
            ...[...teachers].map(([value, label]) => ({ value, label })),
          ]}
        />
        <Select
          aria-label="Xona"
          value={room}
          onChange={(v) => setParams({ room: v || null })}
          style={{ width: 150 }}
          options={[
            { value: '', label: 'Barcha xonalar' },
            ...rooms.map((r) => ({ value: r, label: `${r}-xona` })),
          ]}
        />
        {conflictIds.size > 0 && (
          <button
            type="button"
            className={`ee-pill${onlyConflicts ? ' is-on' : ''}`}
            aria-pressed={onlyConflicts}
            onClick={() => setParams({ conflicts: onlyConflicts ? null : 1 })}
          >
            <WarningOutlined /> To'qnashuv: {conflictIds.size}
          </button>
        )}
        {filtered && (
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setParams({ group: null, room: null, teacher: null, conflicts: null })}
          >
            Tozalash
          </Button>
        )}
      </Flex>

      {all.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Jadval hali tuzilmagan">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
              Birinchi darsni qo'shish
            </Button>
          </Empty>
        </div>
      ) : isPhone ? (
        <DayList
          day={mobileDay}
          onDay={setMobileDay}
          items={shown}
          groupById={groupById}
          conflictIds={conflictIds}
          onEdit={setDetail}
          onAdd={(day) => openCreate({ day_of_week: day })}
        />
      ) : view === 'list' ? (
        <ScheduleTable
          items={shown}
          groupById={groupById}
          conflictIds={conflictIds}
          onEdit={setDetail}
        />
      ) : (
        <WeekGrid
          items={shown}
          all={all}
          conflictIds={conflictIds}
          groupById={groupById}
          renderCard={card}
          onCreate={openCreate}
        />
      )}

      <Modal
        open={detail !== null}
        onCancel={() => setDetail(null)}
        footer={null}
        width={400}
        centered
        className="ee-lcard-modal"
        destroyOnHidden
      >
        {detail && card(detail, () => setDetail(null))}
      </Modal>

      <ScheduleDrawer
        open={drawer.open}
        schedule={drawer.schedule}
        groups={groups.data}
        schedules={all}
        fixedGroup={!drawer.schedule && groupId ? groupId : undefined}
        preset={drawer.preset}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}

/* ------------------------------ Haftalik to'r ------------------------------ */

/** Bir kundagi darslarni ustma-ust tushmasligi uchun yonma-yon "yo'lak"larga bo'ladi */
function layoutDay(items: Schedule[]) {
  const sorted = [...items].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const out: { s: Schedule; lane: number; lanes: number }[] = []
  let cluster: { s: Schedule; lane: number }[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1
  const flush = () => {
    for (const c of cluster) out.push({ ...c, lanes: laneEnds.length })
    cluster = []
    laneEnds = []
  }
  for (const s of sorted) {
    const start = toMin(s.start_time)
    const end = toMin(s.end_time)
    if (start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((e) => e <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else laneEnds[lane] = end
    cluster.push({ s, lane })
    clusterEnd = Math.max(clusterEnd, end)
  }
  flush()
  return out
}

function WeekGrid({
  items,
  all,
  conflictIds,
  groupById,
  renderCard,
  onCreate,
}: {
  items: Schedule[]
  all: Schedule[]
  conflictIds: Set<number>
  groupById: Map<number, Group>
  renderCard: (s: Schedule, close: () => void) => ReactNode
  onCreate: (preset: DrawerState['preset']) => void
}) {
  const [openId, setOpenId] = useState<number | null>(null)
  // Soat oralig'i: barcha darslar bo'yicha (filtr o'zgarganda to'r sakramasin), kamida 08–20
  const first = Math.min(8 * 60, ...all.map((s) => toMin(s.start_time)))
  const last = Math.max(20 * 60, ...all.map((s) => toMin(s.end_time)))
  const startHour = Math.floor(first / 60)
  const endHour = Math.ceil(last / 60)
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const height = hours.length * HOUR
  const y = (min: number) => ((min - startHour * 60) / 60) * HOUR
  const nowMin = dayjs().hour() * 60 + dayjs().minute()
  const nowVisible = nowMin >= startHour * 60 && nowMin <= endHour * 60

  return (
    <div className="ee-panel ee-week">
      <div className="ee-week__grid">
        <div className="ee-week__corner" />
        {DAYS.map((d, i) => {
          const count = items.filter((s) => s.day_of_week === d.value).length
          return (
            <div key={d.value} className={`ee-week__head${i === TODAY_INDEX ? ' is-today' : ''}`}>
              <strong>{d.label}</strong>
              <span>
                {i === TODAY_INDEX ? 'bugun · ' : ''}
                {count ? `${count} ta dars` : "dars yo'q"}
              </span>
            </div>
          )
        })}

        <div className="ee-week__times" style={{ height }}>
          {hours.map((h) => (
            <span key={h} style={{ top: (h - startHour) * HOUR }}>
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        {DAYS.map((d, i) => (
          <div
            key={d.value}
            className={`ee-week__col${i === TODAY_INDEX ? ' is-today' : ''}`}
            style={{ height, ['--ee-hour' as string]: `${HOUR}px` }}
            title="Bo'sh joyni bosing — shu vaqtga dars qo'shiladi"
            onClick={(e) => {
              if (e.target !== e.currentTarget) return
              const rect = e.currentTarget.getBoundingClientRect()
              // 30 daqiqaga yaxlitlab olamiz
              const min = startHour * 60 + Math.floor(((e.clientY - rect.top) / HOUR) * 2) * 30
              onCreate({
                day_of_week: d.value,
                start_time: fromMin(min),
                end_time: fromMin(Math.min(min + 90, 23 * 60 + 55)),
              })
            }}
          >
            {i === TODAY_INDEX && nowVisible && (
              <span className="ee-week__now" style={{ top: y(nowMin) }} aria-hidden />
            )}
            {layoutDay(items.filter((s) => s.day_of_week === d.value)).map(({ s, lane, lanes }) => {
              const start = toMin(s.start_time)
              const end = toMin(s.end_time)
              const live = i === TODAY_INDEX && start <= nowMin && nowMin < end
              const conflict = conflictIds.has(s.id)
              const g = groupById.get(s.group)
              const short = end - start < 60
              return (
                <Popover
                  key={s.id}
                  trigger="click"
                  placement={i < 4 ? 'rightTop' : 'leftTop'}
                  open={openId === s.id}
                  onOpenChange={(o) => setOpenId(o ? s.id : null)}
                  content={renderCard(s, () => setOpenId(null))}
                  classNames={{ root: 'ee-lcard-pop' }}
                  destroyOnHidden
                >
                  <button
                    type="button"
                    className={`ee-lesson${live ? ' is-live' : ''}${conflict ? ' is-conflict' : ''}${openId === s.id ? ' is-open' : ''}`}
                    style={{
                      top: y(start) + 2,
                      height: Math.max(y(end) - y(start) - 4, 22),
                      left: `calc(${(lane / lanes) * 100}% + 4px)`,
                      width: `calc(${100 / lanes}% - 8px)`,
                    }}
                    aria-label={`${d.label}, ${formatTime(s.start_time)}–${formatTime(s.end_time)}, ${s.group_name} — batafsil`}
                  >
                    <span className="ee-lesson__time">
                      {conflict && <WarningOutlined />} {formatTime(s.start_time)}–
                      {formatTime(s.end_time)}
                    </span>
                    <strong className="ee-lesson__title">{s.group_name}</strong>
                    {!short && (
                      <span className="ee-lesson__meta">
                        {[s.room && `${s.room}-xona`, g?.teacher_name].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                </Popover>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ Ro'yxat ------------------------------ */

const dayIndex = (d: DayOfWeekEnum) => DAYS.findIndex((x) => x.value === d)

function ScheduleTable({
  items,
  groupById,
  conflictIds,
  onEdit,
}: {
  items: Schedule[]
  groupById: Map<number, Group>
  conflictIds: Set<number>
  onEdit: (s: Schedule) => void
}) {
  const rows = [...items].sort(
    (a, b) =>
      dayIndex(a.day_of_week) - dayIndex(b.day_of_week) || a.start_time.localeCompare(b.start_time),
  )
  if (rows.length === 0)
    return (
      <div className="ee-panel">
        <Empty description="Tanlangan filtr bo'yicha dars yo'q" />
      </div>
    )
  return (
    <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="ee-table">
        <thead>
          <tr>
            <th>Kun</th>
            <th>Vaqt</th>
            <th>Guruh</th>
            <th>O'qituvchi</th>
            <th>Xona</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const newDay = i === 0 || rows[i - 1].day_of_week !== s.day_of_week
            const g = groupById.get(s.group)
            return (
              <tr key={s.id} className="ee-row-click" onClick={() => onEdit(s)}>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                  {newDay ? DAYS[dayIndex(s.day_of_week)].label : ''}
                </td>
                <td className="ee-num" style={{ whiteSpace: 'nowrap' }}>
                  {formatTime(s.start_time)}–{formatTime(s.end_time)}
                </td>
                <td>
                  <strong>{s.group_name}</strong>
                  {g?.course_name && (
                    <div className="ee-muted" style={{ fontSize: 12 }}>
                      {g.course_name}
                    </div>
                  )}
                </td>
                <td>{g?.teacher_name ?? '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{s.room ? `${s.room}-xona` : '—'}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {conflictIds.has(s.id) && (
                    <span className="ee-tag ee-tag--warn">
                      <WarningOutlined /> To'qnashuv
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------ Telefon: kun bo'yicha ------------------------------ */

function DayList({
  day,
  onDay,
  items,
  groupById,
  conflictIds,
  onEdit,
  onAdd,
}: {
  day: number
  onDay: (i: number) => void
  items: Schedule[]
  groupById: Map<number, Group>
  conflictIds: Set<number>
  onEdit: (s: Schedule) => void
  onAdd: (day: DayOfWeekEnum) => void
}) {
  const d = DAYS[day]
  const list = items
    .filter((s) => s.day_of_week === d.value)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <Flex vertical gap={12}>
      <Segmented
        className="ee-daytabs"
        block
        value={day}
        onChange={(v) => onDay(v as number)}
        options={DAYS.map((x, i) => ({ value: i, label: x.short }))}
      />
      <Flex justify="space-between" align="center">
        <h2 className="ee-heading">
          {d.label}
          {day === TODAY_INDEX && <span className="ee-muted"> · bugun</span>}
        </h2>
        <Button icon={<PlusOutlined />} onClick={() => onAdd(d.value)}>
          Qo'shish
        </Button>
      </Flex>
      {list.length === 0 ? (
        <div className="ee-sunken ee-muted">Bu kunda dars yo'q</div>
      ) : (
        list.map((s) => {
          const g = groupById.get(s.group)
          return (
            <button
              key={s.id}
              type="button"
              className={`ee-lesson ee-lesson--card${conflictIds.has(s.id) ? ' is-conflict' : ''}`}
              onClick={() => onEdit(s)}
            >
              <span className="ee-lesson__time">
                {conflictIds.has(s.id) && <WarningOutlined />} {formatTime(s.start_time)}–
                {formatTime(s.end_time)}
              </span>
              <strong className="ee-lesson__title">{s.group_name}</strong>
              <span className="ee-lesson__meta">
                {[s.room && `${s.room}-xona`, g?.teacher_name].filter(Boolean).join(' · ')}
              </span>
            </button>
          )
        })
      )}
    </Flex>
  )
}
