import {
  CalendarOutlined,
  EditOutlined,
  FlagOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { App, Button, Checkbox, Empty, Flex, Input, Modal, Skeleton, Tabs, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'

import type {
  DayOfWeekEnum,
  Group,
  GroupStudent,
  Schedule,
  User,
} from '@/shared/api/generated/model'
import { formatDate, formatPhone, formatShortDateTime, formatTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { DeleteButton, PageHeader, QueryError, StatusTag, Tag, useFormDrawer } from '@/shared/ui'

import {
  useAdminExams,
  useGroup,
  useGroupMembership,
  useGroups,
  useGroupStudents,
  useSchedules,
  useUsersByRole,
  type AdminExam,
} from '../api'
import { ScheduleDrawer } from '../schedules/ScheduleDrawer'
import { DAYS, scheduleSummary } from '../schedules/scheduleMeta'
import { GroupDrawer } from './GroupDrawer'
import { isClosedGroup } from './groupMeta'
import { Capacity } from './GroupsPage'

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export function GroupDetailPage() {
  const id = Number(useParams().id)
  const group = useGroup(id)
  const [editing, setEditing] = useState(false)
  const [params, setParams] = useUrlState()
  const schedules = useSchedules()

  if (group.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (group.isError) return <QueryError error={group.error} onRetry={() => group.refetch()} />

  const g = group.data
  const closed = isClosedGroup(g)
  const lessons = scheduleSummary((schedules.data ?? []).filter((s) => s.group === g.id))

  return (
    <>
      <PageHeader
        eyebrow={g.course_name}
        title={g.name}
        backTo="/admin/groups"
        extra={
          <>
            <StatusTag kind="group" value={g.status} />
            <Tooltip
              title={closed ? `${g.status_display} guruhni o'zgartirib bo'lmaydi` : undefined}
            >
              <Button icon={<EditOutlined />} onClick={() => setEditing(true)} disabled={closed}>
                Tahrirlash
              </Button>
            </Tooltip>
          </>
        }
      />

      <div className="ee-panel ee-ghero">
        <HeroItem icon={<UserOutlined />} label="O'qituvchi" value={g.teacher_name ?? '—'} />
        <HeroItem
          icon={<CalendarOutlined />}
          label="Dars kunlari"
          value={
            lessons.length ? (
              lessons.map((l) => (
                <span key={l} className="ee-num" style={{ display: 'block' }}>
                  {l}
                </span>
              ))
            ) : (
              <span className="ee-muted">Jadval tuzilmagan</span>
            )
          }
        />
        <HeroItem
          icon={<FlagOutlined />}
          label={g.end_date ? 'Muddat' : 'Boshlangan'}
          value={
            <span className="ee-num">
              {formatDate(g.start_date)}
              {g.end_date && ` – ${formatDate(g.end_date)}`}
            </span>
          }
        />
        <HeroItem icon={<TeamOutlined />} label="O'quvchilar" value={<Capacity group={g} wide />} />
      </div>

      <Tabs
        activeKey={params.get('tab') ?? 'students'}
        onChange={(tab) => setParams({ tab: tab === 'students' ? null : tab })}
        items={[
          {
            key: 'students',
            label: `Talabalar (${g.active_students_count})`,
            children: <StudentsTab group={g} />,
          },
          { key: 'schedule', label: 'Dars jadvali', children: <ScheduleTab group={g} /> },
          { key: 'exams', label: 'Imtihonlar', children: <ExamsTab groupId={g.id} /> },
        ]}
      />

      <GroupDrawer open={editing} group={g} onClose={() => setEditing(false)} />
    </>
  )
}

function HeroItem({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="ee-ghero__item">
      <span className="ee-ghero__icon" aria-hidden>
        {icon}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="ee-ghero__label">{label}</span>
        <span className="ee-ghero__value">{value}</span>
      </span>
    </div>
  )
}

/* ------------------------------ Talabalar ------------------------------ */

function StudentsTab({ group }: { group: Group }) {
  const members = useGroupStudents(group.id)
  const students = useUsersByRole('STUDENT')
  const membership = useGroupMembership(group.id)
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')

  if (members.isPending) return <Skeleton active paragraph={{ rows: 5 }} />
  if (members.isError) return <QueryError error={members.error} onRetry={() => members.refetch()} />

  const active = members.data.filter((m) => !m.left_at)
  const left = members.data.filter((m) => m.left_at)
  const activeIds = new Set(active.map((m) => m.student_id))
  const closed = isClosedGroup(group)
  const full = group.available_seats <= 0
  const addBlocked = closed
    ? `${group.status_display} guruhga talaba qo'shib bo'lmaydi`
    : full
      ? "Guruh to'lgan — avval sig'imni oshiring"
      : null

  const remove = (m: GroupStudent) =>
    membership
      .mutateAsync({ action: 'remove', studentId: m.student_id })
      .then(() => message.success('Talaba guruhdan chiqarildi'))
      .catch((e) => handleError(e))

  return (
    <Flex vertical gap={16}>
      <Flex gap={8} wrap align="center">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: 'var(--ee-text-3)' }} />}
          placeholder="Guruhdagi o'quvchini qidirish"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: '1 1 240px', maxWidth: 320 }}
        />
        <Tooltip title={addBlocked}>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setAdding(true)}
            disabled={!!addBlocked}
            style={{ marginLeft: 'auto' }}
          >
            O'quvchi qo'shish
          </Button>
        </Tooltip>
      </Flex>

      {active.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Guruhda hali o'quvchi yo'q">
            {!addBlocked && (
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAdding(true)}>
                O'quvchi qo'shish
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <MembersTable
          members={active.filter((m) =>
            [m.student_name, m.student_username, m.student_phone].some((v) =>
              v?.toLowerCase().includes(query.trim().toLowerCase()),
            ),
          )}
          action={(m) =>
            closed ? null : (
              <DeleteButton
                title={`${m.student_name} guruhdan chiqarilsinmi?`}
                description="O'chirilmaydi — tarixda qoladi, natija va davomati saqlanadi."
                onConfirm={() => remove(m)}
              />
            )
          }
        />
      )}

      {left.length > 0 && (
        <>
          <h2 className="ee-heading" style={{ marginTop: 8 }}>
            Guruhdan chiqqanlar
          </h2>
          <MembersTable members={left} />
        </>
      )}

      <AddStudentsModal
        open={adding}
        onClose={() => setAdding(false)}
        candidates={(students.data ?? []).filter((s) => !activeIds.has(s.id))}
        loading={students.isLoading}
        seats={group.available_seats}
        onAdd={async (ids) => {
          // Backend bittalab qo'shadi — ketma-ket yuboramiz
          let done = 0
          try {
            for (const id of ids) {
              await membership.mutateAsync({ action: 'add', studentId: id })
              done++
            }
            message.success(`${done} ta o'quvchi guruhga qo'shildi`)
            setAdding(false)
          } catch (e) {
            if (done) message.info(`${done} ta o'quvchi qo'shildi, qolganida xato`)
            handleError(e)
          }
        }}
      />
    </Flex>
  )
}

function AddStudentsModal({
  open,
  onClose,
  candidates,
  loading,
  seats,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  candidates: User[]
  loading: boolean
  seats: number
  onAdd: (ids: number[]) => Promise<void>
}) {
  const [picked, setPicked] = useState<number[]>([])
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const name = (s: User) => [s.first_name, s.last_name].filter(Boolean).join(' ') || s.username
  const shown = candidates.filter((s) =>
    [name(s), s.username, s.phone].some((v) => v?.toLowerCase().includes(q.trim().toLowerCase())),
  )
  const full = picked.length >= seats

  return (
    <Modal
      open={open}
      title="Guruhga o'quvchi qo'shish"
      onCancel={onClose}
      centered
      destroyOnHidden
      afterOpenChange={(o) => {
        if (!o) {
          setPicked([])
          setQ('')
        }
      }}
      okText={picked.length ? `Qo'shish (${picked.length})` : "Qo'shish"}
      cancelText="Bekor qilish"
      okButtonProps={{ disabled: !picked.length, loading: saving }}
      onOk={async () => {
        setSaving(true)
        await onAdd(picked)
        setSaving(false)
      }}
    >
      <Input
        autoFocus
        allowClear
        prefix={<SearchOutlined style={{ color: 'var(--ee-text-3)' }} />}
        placeholder="Ism, login yoki telefon"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Flex justify="space-between" style={{ marginTop: 10, fontSize: 12 }} className="ee-muted">
        <span>Tanlandi: {picked.length}</span>
        <span>Bo'sh o'rin: {Math.max(seats - picked.length, 0)}</span>
      </Flex>
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} title={false} />
      ) : shown.length === 0 ? (
        <Empty
          style={{ margin: '24px 0' }}
          description={
            candidates.length
              ? "Qidiruv bo'yicha o'quvchi topilmadi"
              : "Qo'shiladigan o'quvchi yo'q — avval Foydalanuvchilar bo'limida qo'shing"
          }
        />
      ) : (
        <div className="ee-pick-list" role="listbox" aria-multiselectable>
          {shown.map((s) => {
            const on = picked.includes(s.id)
            const disabled = !on && full
            return (
              <label
                key={s.id}
                className={`ee-pick${on ? ' is-on' : ''}`}
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <Checkbox
                  checked={on}
                  disabled={disabled}
                  onChange={() =>
                    setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))
                  }
                />
                <span className="ee-avatar ee-avatar--sm">{initials(name(s))}</span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block' }}>{name(s)}</strong>
                  <span className="ee-muted ee-num" style={{ fontSize: 12 }}>
                    {formatPhone(s.phone)}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      )}
      {full && (
        <p className="ee-muted" style={{ margin: '10px 0 0', fontSize: 12 }}>
          Guruhda bo'sh o'rin qolmadi — ko'proq qo'shish uchun sig'imni oshiring.
        </p>
      )}
    </Modal>
  )
}

function MembersTable({
  members,
  action,
}: {
  members: GroupStudent[]
  action?: (m: GroupStudent) => ReactNode
}) {
  return (
    <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="ee-table ee-table--compact">
        <thead>
          <tr>
            <th>Talaba</th>
            <th>Telefon</th>
            <th>Qo'shilgan</th>
            {members.some((m) => m.left_at) && <th>Chiqqan</th>}
            {action && <th aria-label="Harakatlar" />}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const name = m.student_name || m.student_username
            return (
              <tr key={m.id}>
                <td style={{ minWidth: 180 }}>
                  <Flex align="center" gap={10}>
                    <span className="ee-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                      {initials(name)}
                    </span>
                    <span>
                      <strong style={{ display: 'block' }}>{name}</strong>
                      <span className="ee-muted ee-mono" style={{ fontSize: 12 }}>
                        @{m.student_username}
                      </span>
                    </span>
                  </Flex>
                </td>
                <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                  {formatPhone(m.student_phone)}
                </td>
                <td className="ee-mono">{formatDate(m.joined_at)}</td>
                {m.left_at && <td className="ee-mono">{formatDate(m.left_at)}</td>}
                {action && <td style={{ textAlign: 'right' }}>{action(m)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------ Dars jadvali ------------------------------ */

function ScheduleTab({ group }: { group: Group }) {
  const schedules = useSchedules()
  const groups = useGroups()
  const drawer = useFormDrawer<Schedule>()
  const [presetDay, setPresetDay] = useState<DayOfWeekEnum | undefined>()
  const closed = isClosedGroup(group)
  const todayIndex = (dayjs().day() + 6) % 7

  if (schedules.isPending) return <Skeleton active paragraph={{ rows: 4 }} />
  if (schedules.isError)
    return <QueryError error={schedules.error} onRetry={() => schedules.refetch()} />

  const dayIndex = new Map(DAYS.map((d, i) => [d.value, i]))
  const mine = schedules.data
    .filter((s) => s.group === group.id)
    .sort(
      (a, b) =>
        (dayIndex.get(a.day_of_week) ?? 0) - (dayIndex.get(b.day_of_week) ?? 0) ||
        a.start_time.localeCompare(b.start_time),
    )

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" gap={12} wrap>
        <span className="ee-muted" style={{ fontSize: 13 }}>
          {mine.length
            ? `Haftada ${mine.length} ta dars. Darsni bosing — tahrirlash yoki o'chirish.`
            : "Jadval hali tuzilmagan. Kun ostidagi «+» ni bosing yoki bir nechta kunni birdan qo'shing."}
        </span>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setPresetDay(undefined)
            drawer.openCreate()
          }}
          disabled={closed}
        >
          Dars qo'shish
        </Button>
      </Flex>
      <div className="ee-gweek">
        {DAYS.map((d, i) => {
          const items = mine.filter((s) => s.day_of_week === d.value)
          return (
            <section
              key={d.value}
              className={`ee-gweek__day${i === todayIndex ? ' is-today' : ''}`}
            >
              <span className="ee-gweek__name">
                {d.label}
                {i === todayIndex && <span className="ee-muted"> · bugun</span>}
              </span>
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="ee-lesson ee-lesson--card"
                  style={{ padding: '8px 10px' }}
                  disabled={closed}
                  onClick={() => drawer.openEdit(s)}
                  aria-label={`${d.label}, ${formatTime(s.start_time)} — tahrirlash`}
                >
                  <span className="ee-lesson__time">
                    {formatTime(s.start_time)}–{formatTime(s.end_time)}
                  </span>
                  <span className="ee-lesson__meta">{s.room ? `${s.room}-xona` : "Xona yo'q"}</span>
                </button>
              ))}
              {!closed && (
                <button
                  type="button"
                  className="ee-gweek__add"
                  onClick={() => {
                    setPresetDay(d.value)
                    drawer.openCreate()
                  }}
                  aria-label={`${d.label} kuniga dars qo'shish`}
                >
                  + Qo'shish
                </button>
              )}
            </section>
          )
        })}
      </div>
      <ScheduleDrawer
        open={drawer.open}
        schedule={drawer.record}
        groups={groups.data ?? [group]}
        schedules={schedules.data}
        fixedGroup={group.id}
        preset={presetDay ? { day_of_week: presetDay } : undefined}
        onClose={drawer.close}
      />
    </Flex>
  )
}

/* ------------------------------ Imtihonlar ------------------------------ */

function ExamsTab({ groupId }: { groupId: number }) {
  const exams = useAdminExams()

  if (exams.isPending) return <Skeleton active paragraph={{ rows: 4 }} />
  if (exams.isError) return <QueryError error={exams.error} onRetry={() => exams.refetch()} />

  const list = exams.data
    .filter((e) => e.group === groupId)
    .sort((a, b) => dayjs(b.deadline).diff(dayjs(a.deadline)))

  if (list.length === 0)
    return (
      <div className="ee-panel">
        <Empty description="Bu guruhda hali imtihon yo'q — imtihonni o'qituvchi yaratadi" />
      </div>
    )

  return <ExamsTable exams={list} />
}

export function ExamsTable({ exams, showGroup }: { exams: AdminExam[]; showGroup?: boolean }) {
  return (
    <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="ee-table ee-table--compact">
        <thead>
          <tr>
            <th>Imtihon</th>
            <th>Deadline</th>
            <th>Savollar</th>
            <th>O'tish bali</th>
            <th>Holati</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((e) => (
            <tr key={e.id}>
              <td style={{ minWidth: 200 }}>
                <strong>{e.name}</strong>
                <div className="ee-muted" style={{ fontSize: 13 }}>
                  {showGroup && `${e.group_name} · `}
                  {e.teacher_name}
                </div>
              </td>
              <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                {formatShortDateTime(e.deadline)}
              </td>
              <td className="ee-mono">
                {e.questions_count} · {e.total_points} ball
              </td>
              <td className="ee-mono">{e.passing_score ?? 0}</td>
              <td>
                {!e.is_active ? (
                  <Tag variant="neu">Nofaol</Tag>
                ) : e.is_expired ? (
                  <Tag variant="warn">Yakunlangan</Tag>
                ) : (
                  <Tag variant="prog">Faol</Tag>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
