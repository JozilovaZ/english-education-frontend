import {
  AlertOutlined,
  ApartmentOutlined,
  BankOutlined,
  BellOutlined,
  CalendarOutlined,
  FundOutlined,
  RightOutlined,
  SolutionOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Segmented, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { useAuthStore } from '@/features/auth/store'
import type { DayOfWeekEnum, Group, Schedule, User } from '@/shared/api/generated/model'
import { formatDate, formatPhone, formatTime, fullName } from '@/shared/lib/format'
import {
  DonutChart,
  LineChart,
  QueryError,
  StatRow,
  STATUS_MAPS,
  StatTile,
  Tag,
  type LinePoint,
} from '@/shared/ui'

import { useGroups, useGroupStatistics, useParents, useSchedules, useUsers } from './api'

const WEEKDAYS: DayOfWeekEnum[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Admin bosh sahifasi — namuna dizayn (rasm/img.png) bo'yicha, faqat haqiqiy ma'lumotlar bilan */
export function AdminHomePage() {
  const user = useAuthStore((s) => s.user)
  const stats = useGroupStatistics()
  const users = useUsers()
  const schedules = useSchedules()
  const groups = useGroups()
  const parents = useParents()

  if (stats.isPending) return <Skeleton active paragraph={{ rows: 12 }} />
  if (stats.isError) return <QueryError error={stats.error} onRetry={() => stats.refetch()} />

  const s = stats.data
  const st = s.students_statistics
  const allUsers = users.data ?? []
  const teachers = allUsers.filter((u) => u.role === 'TEACHER' && u.is_active !== false)
  const students = allUsers.filter((u) => u.role === 'STUDENT')
  const activeStudents = students.filter((u) => u.is_active !== false)
  const withParent = new Set((parents.data ?? []).map((p) => p.user))
  const noParent = activeStudents.filter((u) => !withParent.has(u.id)).length
  const joinedThisMonth = students.filter((u) =>
    dayjs(u.date_joined).isSame(dayjs(), 'month'),
  ).length

  const today = WEEKDAYS[dayjs().day()]
  const todaySlots = (schedules.data ?? [])
    .filter((x) => x.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const recruiting = (groups.data ?? []).filter(
    (g) => g.status === 'recruiting' && g.available_seats > 0,
  )
  const centerName = cap(user?.schemaName ?? '') || "O'quv markazi"
  const name = user?.firstName || user?.username

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Salomlashish + sana va markaz */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <h1 className="ee-display">
            Assalomu alaykum, <span className="ee-hl">{name}</span>! <span aria-hidden>👋</span>
          </h1>
          <span className="ee-muted">
            {todaySlots.length
              ? `Bugun markazingizda ${todaySlots.length} ta dars bor. Ishingizga omad!`
              : "Bugun jadvalda dars yo'q. Markazingizdagi asosiy ko'rsatkichlar quyida."}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <span className="ee-pill-box">
            <CalendarOutlined />
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <strong>{dayjs().format('D-MMMM, YYYY')}</strong>
              <span className="ee-muted" style={{ fontSize: 12 }}>
                {cap(dayjs().format('dddd'))}
              </span>
            </span>
          </span>
          <span className="ee-pill-box">
            <BankOutlined />
            <strong>{centerName}</strong>
          </span>
        </div>
      </section>

      {/* KPI kartochkalari */}
      <StatRow min={230}>
        <StatTile
          label="Jami o'quvchilar"
          value={users.data ? activeStudents.length : '—'}
          icon={<UserOutlined />}
          hint={
            joinedThisMonth > 0 ? (
              <>
                <span style={{ color: 'var(--ee-success-text)', fontWeight: 700 }}>
                  ↑ {joinedThisMonth}
                </span>{' '}
                shu oyda qo'shildi
              </>
            ) : (
              `${st.total_active_students} tasi guruhlarda`
            )
          }
          to="/admin/users?role=STUDENT"
        />
        <StatTile
          label="Faol guruhlar"
          value={s.by_status.active?.count ?? 0}
          icon={<TeamOutlined />}
          hint={`jami ${s.total_groups} ta guruh`}
          to="/admin/groups?status=active"
        />
        <StatTile
          label="O'qituvchilar"
          value={users.data ? teachers.length : '—'}
          icon={<SolutionOutlined />}
          hint={`${s.by_teacher.length} tasi guruhga biriktirilgan`}
          to="/admin/users?role=TEACHER"
        />
        <StatTile
          label="Bo'sh o'rinlar"
          value={st.total_available_seats}
          icon={<AlertOutlined />}
          hint={`guruhlar ${Math.round(st.occupancy_rate_percentage)}% to'lgan`}
          to="/admin/groups?seats=free"
        />
      </StatRow>

      <div className="ee-dash-grid">
        <section className="ee-panel ee-span-5">
          <NewStudentsChart students={students} loading={users.isPending} />
        </section>

        <section className="ee-panel ee-span-3">
          <div className="ee-card-head">
            <h2>
              <ThunderboltOutlined /> Tezkor amallar
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <QuickAction
              to="/admin/users?role=STUDENT&new=1"
              icon={<UserAddOutlined />}
              label="Yangi o'quvchi qo'shish"
            />
            <QuickAction
              to="/admin/groups?new=1"
              icon={<ApartmentOutlined />}
              label="Guruh yaratish"
            />
            <QuickAction
              to="/admin/parents?new=1"
              icon={<UsergroupAddOutlined />}
              label="Ota-ona biriktirish"
            />
            <QuickAction to="/admin/schedules" icon={<CalendarOutlined />} label="Dars jadvali" />
          </div>
        </section>

        <section className="ee-panel ee-span-4">
          <div className="ee-card-head">
            <h2>
              <CalendarOutlined /> Bugungi darslar
            </h2>
            <Link to="/admin/schedules" className="ee-more-link">
              Barchasi <RightOutlined style={{ fontSize: 10 }} />
            </Link>
          </div>
          {schedules.isPending || groups.isPending ? (
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          ) : (
            <TodayLessons slots={todaySlots} groups={groups.data ?? []} />
          )}
        </section>

        <section className="ee-panel ee-span-5" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="ee-card-head" style={{ padding: '20px 20px 0' }}>
            <h2>
              <UserOutlined /> So'nggi qo'shilgan o'quvchilar
            </h2>
            <Link to="/admin/users?role=STUDENT" className="ee-more-link">
              Barchasi <RightOutlined style={{ fontSize: 10 }} />
            </Link>
          </div>
          {users.isPending ? (
            <div style={{ padding: 20 }}>
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            </div>
          ) : (
            <RecentStudents students={students} withParent={withParent} />
          )}
        </section>

        <section className="ee-panel ee-span-4">
          <div className="ee-card-head">
            <h2>
              <FundOutlined /> Guruhlar bo'yicha statistika
            </h2>
          </div>
          {s.total_groups === 0 ? (
            <span className="ee-muted">Hali guruh yo'q.</span>
          ) : (
            <DonutChart
              totalLabel="Jami guruh"
              data={
                s.by_course.length
                  ? s.by_course.map((c) => ({ label: c.course_name, value: c.groups_count }))
                  : Object.entries(s.by_status).map(([k, v]) => ({
                      label: STATUS_MAPS.group[k as keyof typeof STATUS_MAPS.group]?.label ?? k,
                      value: v.count,
                    }))
              }
            />
          )}
        </section>

        <section className="ee-panel ee-span-3">
          <div className="ee-card-head">
            <h2>
              <BellOutlined /> Eslatmalar
            </h2>
          </div>
          <div className="ee-feed">
            {noParent > 0 && (
              <Reminder
                to="/admin/parents"
                color="var(--ee-danger)"
                title={`${noParent} ta o'quvchiga ota-ona biriktirilmagan`}
                meta="Natijalar ota-onaga yuborilmaydi"
              />
            )}
            {recruiting.length > 0 && (
              <Reminder
                to="/admin/groups?status=recruiting"
                color="var(--ee-warning)"
                title={`${recruiting.length} ta guruhga o'quvchi yig'ilmoqda`}
                meta={recruiting
                  .slice(0, 2)
                  .map((g) => g.name)
                  .join(', ')}
              />
            )}
            {st.empty_groups_count > 0 && (
              <Reminder
                to="/admin/groups"
                color="var(--ee-accent)"
                title={`${st.empty_groups_count} ta guruhda o'quvchi yo'q`}
                meta="Guruhga o'quvchi qo'shing"
              />
            )}
            {(s.by_status.paused?.count ?? 0) > 0 && (
              <Reminder
                to="/admin/groups?status=paused"
                color="var(--ee-info)"
                title={`${s.by_status.paused?.count} ta guruh to'xtatilgan`}
                meta="Holatini tekshiring"
              />
            )}
            {noParent === 0 &&
              recruiting.length === 0 &&
              st.empty_groups_count === 0 &&
              !s.by_status.paused?.count && (
                <span className="ee-muted">
                  Hammasi joyida — e'tibor talab qiladigan narsa yo'q.
                </span>
              )}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ------------------------------ Bo'laklar ------------------------------ */

function QuickAction({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link to={to} className="ee-action">
      <span className="ee-action__icon" aria-hidden>
        {icon}
      </span>
      {label}
      <RightOutlined className="ee-action__arrow" />
    </Link>
  )
}

function Reminder({
  to,
  color,
  title,
  meta,
}: {
  to: string
  color: string
  title: string
  meta?: string
}) {
  return (
    <Link to={to} className="ee-feed__item">
      <span className="ee-feed__dot" style={{ background: color }} aria-hidden />
      <span className="ee-feed__body">
        <span className="ee-feed__title">{title}</span>
        {meta && <span className="ee-feed__meta">{meta}</span>}
      </span>
      <RightOutlined style={{ fontSize: 11, color: 'var(--ee-text-3)' }} />
    </Link>
  )
}

/** Oylar bo'yicha yangi o'quvchilar (ro'yxatdan o'tgan sanasi bo'yicha) */
function NewStudentsChart({ students, loading }: { students: User[]; loading: boolean }) {
  const [months, setMonths] = useState(6)
  const start = dayjs()
    .startOf('month')
    .subtract(months - 1, 'month')
  const data: LinePoint[] = Array.from({ length: months }, (_, i) => {
    const m = start.add(i, 'month')
    return {
      label: cap(m.format('MMM')),
      title: cap(m.format('MMMM YYYY')),
      value: students.filter((u) => dayjs(u.date_joined).isSame(m, 'month')).length,
    }
  })

  return (
    <>
      <div className="ee-card-head">
        <h2>
          <FundOutlined /> Yangi o'quvchilar dinamikasi
        </h2>
        <Segmented
          size="small"
          value={months}
          onChange={(v) => setMonths(v as number)}
          options={[
            { value: 6, label: '6 oy' },
            { value: 12, label: '12 oy' },
          ]}
        />
      </div>
      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} title={false} />
      ) : (
        <LineChart data={data} unit="o'quvchi" caption="Oylar bo'yicha yangi o'quvchilar" />
      )}
    </>
  )
}

const LESSON_BADGES = ['violet', 'orange', 'green', 'pink', 'sky', 'indigo'] as const

function TodayLessons({ slots, groups }: { slots: Schedule[]; groups: Group[] }) {
  if (slots.length === 0) {
    return (
      <span className="ee-muted">
        Bugun jadvalda dars yo'q. <Link to="/admin/schedules">Jadvalni ochish</Link>
      </span>
    )
  }
  const groupById = new Map(groups.map((g) => [g.id, g]))
  // Rang guruhga bog'liq (tartibga emas): guruh id bo'yicha
  const badge = (id: number) => LESSON_BADGES[id % LESSON_BADGES.length]
  const now = dayjs().format('HH:mm:ss')

  return (
    <div className="ee-feed">
      {slots.slice(0, 5).map((x) => {
        const g = groupById.get(x.group)
        const done = x.end_time <= now
        const live = x.start_time <= now && now < x.end_time
        const tone = badge(x.group)
        return (
          <Link key={x.id} to={`/admin/groups/${x.group}`} className="ee-feed__item">
            <span
              className="ee-feed__dot"
              aria-hidden
              style={{
                background: live
                  ? 'var(--ee-success)'
                  : done
                    ? 'var(--ee-text-3)'
                    : 'var(--ee-accent)',
              }}
            />
            <span className="ee-feed__body">
              <span className="ee-feed__title ee-num">
                {formatTime(x.start_time)} – {formatTime(x.end_time)}
                {live && (
                  <span style={{ marginLeft: 8 }}>
                    <Tag variant="pos">Hozir</Tag>
                  </span>
                )}
              </span>
              <span className="ee-feed__meta">{x.group_name}</span>
              <span className="ee-feed__meta">
                {[g?.teacher_name, x.room && `${x.room}-xona`].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span
              className="ee-badge-round"
              aria-hidden
              style={{
                background: `linear-gradient(135deg, var(--ee-tone-${tone}-a), var(--ee-tone-${tone}-b))`,
              }}
            >
              {x.group_name.slice(0, 2).toUpperCase()}
            </span>
          </Link>
        )
      })}
      {slots.length > 5 && (
        <Link to="/admin/schedules" className="ee-muted" style={{ paddingTop: 10, fontSize: 13 }}>
          Yana {slots.length - 5} ta dars
        </Link>
      )}
    </div>
  )
}

function RecentStudents({ students, withParent }: { students: User[]; withParent: Set<number> }) {
  const recent = [...students]
    .sort((a, b) => b.date_joined.localeCompare(a.date_joined))
    .slice(0, 5)

  if (recent.length === 0) {
    return (
      <p className="ee-muted" style={{ padding: 20, margin: 0 }}>
        Hali o'quvchi yo'q.
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Tor kartochka: 3 ustun — sana ism ostida, bloklangani ism yonida */}
      <table className="ee-table ee-table--compact">
        <thead>
          <tr>
            <th>Ism va familiya</th>
            <th>Telefon</th>
            <th>Ota-ona</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((u) => {
            const name = fullName(u)
            const initials = name
              .split(' ')
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
            return (
              <tr key={u.id}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span className="ee-avatar ee-avatar--sm">{initials}</span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', whiteSpace: 'nowrap' }}>
                        {name} {u.is_active === false && <Tag variant="neg">Bloklangan</Tag>}
                      </strong>
                      <span className="ee-muted ee-num" style={{ fontSize: 12 }}>
                        {formatDate(u.date_joined)}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="ee-num" style={{ whiteSpace: 'nowrap' }}>
                  {formatPhone(u.phone)}
                </td>
                <td>
                  {withParent.has(u.id) ? (
                    <Tag variant="pos">Bor</Tag>
                  ) : (
                    <Tag variant="warn">Yo'q</Tag>
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
