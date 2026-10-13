import { PlusOutlined } from '@ant-design/icons'
import { Button, Flex, Segmented, Skeleton } from 'antd'

import type { Lesson } from '@/shared/api/generated/model'
import { useUrlState } from '@/shared/lib/useUrlState'
import { QueryError, Tag, useFormDrawer } from '@/shared/ui'

import { useTeacherGroups, useTeacherLessons } from '../api'
import { LessonDrawer } from './LessonDrawer'
import { byDateDesc, lessonState } from './lessonMeta'
import { LessonsTable } from './LessonsTable'

/** Darslar: kelgusi (yaqinidan boshlab) va o'tilgan (oxirgisidan boshlab) */
export function TeacherLessonsPage() {
  const groups = useTeacherGroups()
  const lessons = useTeacherLessons()
  const drawer = useFormDrawer<Lesson>()
  const [params, setParams] = useUrlState()

  if (groups.isPending || lessons.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (groups.isError) return <QueryError error={groups.error} onRetry={() => groups.refetch()} />
  if (lessons.isError) return <QueryError error={lessons.error} onRetry={() => lessons.refetch()} />

  const groupList = groups.data
  const groupId = Number(params.get('group')) || (groupList.length === 1 ? groupList[0].id : 0)
  const group = groupList.find((g) => g.id === groupId)
  const list = lessons.data.filter((l) => !groupId || l.group === groupId)
  const past = list.filter((l) => lessonState(l) === 'done').sort(byDateDesc)
  const upcoming = list.filter((l) => lessonState(l) !== 'done').sort((a, b) => byDateDesc(b, a))

  return (
    <Flex vertical gap={20}>
      <Flex justify="space-between" align="flex-end" gap={16} wrap>
        <Flex vertical gap={6}>
          <span className="ee-eyebrow">
            {group ? `${group.name} · ${group.course_name}` : `${groupList.length} ta guruh`}
          </span>
          <h1 className="ee-title">Darslar</h1>
        </Flex>
        <Flex gap={8} align="center" wrap>
          <Tag variant="neu">Rejada: {upcoming.length}</Tag>
          <Tag variant="neu">O'tilgan: {past.length}</Tag>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={drawer.openCreate}
            disabled={groupList.length === 0}
          >
            Yangi dars
          </Button>
        </Flex>
      </Flex>

      {groupList.length > 1 && (
        <Segmented
          value={groupId}
          onChange={(v) => setParams({ group: v || null })}
          options={[
            { value: 0, label: 'Hammasi' },
            ...groupList.map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
      )}

      <h2 className="ee-heading">Kelgusi darslar</h2>
      <LessonsTable
        lessons={upcoming}
        showGroup={!groupId}
        onEdit={drawer.openEdit}
        emptyText="Rejalashtirilgan dars yo'q — «Yangi dars» tugmasi orqali qo'shing"
      />

      <h2 className="ee-heading" style={{ marginTop: 12 }}>
        O'tilgan darslar
      </h2>
      <LessonsTable
        lessons={past}
        showGroup={!groupId}
        onEdit={drawer.openEdit}
        emptyText="Hali o'tilgan dars yo'q"
      />

      <LessonDrawer
        open={drawer.open}
        lesson={drawer.record}
        groups={groupList}
        lessons={lessons.data}
        defaultGroup={groupId || undefined}
        onClose={drawer.close}
      />
    </Flex>
  )
}
