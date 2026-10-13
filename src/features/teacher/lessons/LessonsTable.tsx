import {
  CheckSquareOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderAddOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import { App, Button, Dropdown, Empty } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router'

import type { Lesson } from '@/shared/api/generated/model'
import { formatTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { Tag } from '@/shared/ui'

import { useDeleteLesson } from '../api'
import { canMarkAttendance, LESSON_STATE, lessonState } from './lessonMeta'

interface LessonsTableProps {
  lessons: Lesson[]
  /** Guruh nomini ko'rsatish (bir nechta guruh aralash bo'lsa) */
  showGroup?: boolean
  onEdit: (lesson: Lesson) => void
  emptyText: string
}

/** Darslar jadvali: Darslar sahifasi va guruh sahifasidagi "Darslar" bo'limi */
export function LessonsTable({ lessons, showGroup, onEdit, emptyText }: LessonsTableProps) {
  const remove = useDeleteLesson()
  const handleError = useApiErrorHandler()
  const navigate = useNavigate()
  const { modal, message } = App.useApp()

  if (lessons.length === 0) {
    return (
      <div className="ee-panel">
        <Empty description={emptyText} />
      </div>
    )
  }

  const confirmDelete = (l: Lesson) =>
    modal.confirm({
      title: `${l.lesson_number}-darsni o'chirasizmi?`,
      content: "Darsga bog'langan davomat, material va uy vazifalari ham o'chadi.",
      okText: "O'chirish",
      okButtonProps: { danger: true },
      cancelText: 'Bekor qilish',
      onOk: () =>
        remove
          .mutateAsync(l.id)
          .then(() => message.success("Dars o'chirildi"))
          .catch(handleError),
    })

  return (
    <div className="ee-panel" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="ee-table ee-table--compact">
        <thead>
          <tr>
            <th style={{ width: 56 }}>№</th>
            <th>Mavzu</th>
            <th>Sana · vaqt</th>
            <th>Holati</th>
            <th aria-label="Harakatlar" />
          </tr>
        </thead>
        <tbody>
          {lessons.map((l) => {
            const state = LESSON_STATE[lessonState(l)]
            const done = lessonState(l) === 'done'
            return (
              <tr key={l.id}>
                <td className="ee-mono">{l.lesson_number}</td>
                <td style={{ minWidth: 200 }}>
                  <strong>{l.title}</strong>
                  {(showGroup || l.description) && (
                    <div className="ee-muted" style={{ fontSize: 13 }}>
                      {showGroup && l.group_name}
                      {showGroup && l.description && ' · '}
                      {l.description}
                    </div>
                  )}
                </td>
                <td className="ee-mono" style={{ whiteSpace: 'nowrap' }}>
                  {dayjs(l.date).format('DD.MM.YYYY')}
                  <div className="ee-muted" style={{ fontSize: 13 }}>
                    {formatTime(l.start_time)}–{formatTime(l.end_time)}
                  </div>
                </td>
                <td>
                  <Tag variant={state.variant}>{state.label}</Tag>
                </td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {canMarkAttendance(l) && (
                    <Button
                      size="small"
                      icon={<CheckSquareOutlined />}
                      onClick={() => navigate(`/teacher/attendance?lesson=${l.id}`)}
                      style={{ marginRight: 4 }}
                    >
                      Davomat
                    </Button>
                  )}
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        {
                          key: 'material',
                          icon: <FolderAddOutlined />,
                          label: "Material qo'shish",
                          disabled: !done,
                          title: done ? undefined : "Material dars o'tilgandan keyin qo'shiladi",
                        },
                        { key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash' },
                        { type: 'divider' },
                        {
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          label: "O'chirish",
                          danger: true,
                        },
                      ],
                      onClick: ({ key }) => {
                        if (key === 'material') navigate(`/teacher/materials?lesson=${l.id}`)
                        if (key === 'edit') onEdit(l)
                        if (key === 'delete') confirmDelete(l)
                      },
                    }}
                  >
                    <Button type="text" icon={<MoreOutlined />} aria-label="Harakatlar" />
                  </Dropdown>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
