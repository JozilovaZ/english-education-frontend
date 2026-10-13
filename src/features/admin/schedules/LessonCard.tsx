import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { App, Button, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import type { Group, Schedule } from '@/shared/api/generated/model'
import { formatTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'

import { useDeleteSchedule } from '../api'
import { DAYS, findConflicts } from './scheduleMeta'

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function durationText(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return [h && `${h} soat`, m && `${m} daqiqa`].filter(Boolean).join(' ')
}

/** Dars kartochkasi: jadvaldagi darsni bosganda chiqadigan batafsil ma'lumot va amallar */
export function LessonCard({
  schedule: s,
  group: g,
  all,
  onEdit,
  onClose,
}: {
  schedule: Schedule
  group?: Group
  all: Schedule[]
  onEdit: () => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const remove = useDeleteSchedule()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  const day = DAYS.find((d) => d.value === s.day_of_week)
  const isToday = DAYS[(dayjs().day() + 6) % 7].value === s.day_of_week
  const now = dayjs().format('HH:mm:ss')
  const live = isToday && s.start_time <= now && now < s.end_time
  const conflicts = findConflicts(all, s, s.id)

  return (
    <div className="ee-lcard">
      <div className="ee-lcard__head">
        <span className="ee-lcard__day">
          {day?.label}
          {isToday && ' · bugun'}
        </span>
        <span className="ee-lcard__time ee-num">
          {formatTime(s.start_time)} – {formatTime(s.end_time)}
        </span>
        <span className="ee-lcard__dur">
          <ClockCircleOutlined /> {durationText(toMin(s.end_time) - toMin(s.start_time))}
          {live && <span className="ee-lcard__live">Hozir davom etmoqda</span>}
        </span>
      </div>

      <div className="ee-lcard__body">
        <div>
          <div className="ee-lcard__title">{s.group_name}</div>
          {g?.course_name && <div className="ee-muted">{g.course_name}</div>}
        </div>
        <dl className="ee-lcard__facts">
          <Fact icon={<UserOutlined />} label="O'qituvchi" value={g?.teacher_name ?? '—'} />
          <Fact
            icon={<EnvironmentOutlined />}
            label="Xona"
            value={s.room ? `${s.room}-xona` : 'Belgilanmagan'}
          />
          <Fact
            icon={<TeamOutlined />}
            label="O'quvchilar"
            value={g ? `${g.active_students_count} / ${g.capacity}` : '—'}
          />
        </dl>
        {conflicts.length > 0 && (
          <div className="ee-lcard__warn">
            <strong>
              <WarningOutlined /> Vaqt to'qnashuvi
            </strong>
            {conflicts.map((c) => (
              <span key={c.id}>
                {c.group_name}, {formatTime(c.start_time)}–{formatTime(c.end_time)}
                {c.group === s.group ? ' — shu guruhning boshqa darsi' : ' — xona band'}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ee-lcard__actions">
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => {
            onClose()
            onEdit()
          }}
        >
          Tahrirlash
        </Button>
        <Button icon={<ExportOutlined />} onClick={() => navigate(`/admin/groups/${s.group}`)}>
          Guruhni ochish
        </Button>
        <Popconfirm
          title="Dars jadvaldan o'chirilsinmi?"
          okText="O'chirish"
          okButtonProps={{ danger: true }}
          cancelText="Bekor qilish"
          onConfirm={() =>
            remove
              .mutateAsync(s.id)
              .then(() => {
                message.success("O'chirildi")
                onClose()
              })
              .catch((e) => handleError(e))
          }
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="O'chirish"
            loading={remove.isPending}
            style={{ marginLeft: 'auto' }}
          />
        </Popconfirm>
      </div>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="ee-lcard__fact">
      <span className="ee-lcard__ficon" aria-hidden>
        {icon}
      </span>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
