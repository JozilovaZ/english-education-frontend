import { LinkOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Empty, Flex, Form, Input, Segmented, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import type { Lesson, LessonMaterial } from '@/shared/api/generated/model'
import { formatShortDateTime } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { DeleteButton, FileDrop, FormDrawer, PageHeader, QueryError } from '@/shared/ui'

import {
  useCreateMaterial,
  useDeleteMaterial,
  useTeacherGroups,
  useTeacherLessons,
  useTeacherMaterials,
} from '../api'
import { byDateDesc, lessonLabel, lessonState } from '../lessons/lessonMeta'

/** Backendda tur cheklovi yo'q — talabalar ochishi mumkin bo'lgan keng tarqalgan turlar */
const ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.mp3',
  '.mp4',
]
const MAX_MB = 20

const fileName = (url: string) => decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? url)

/** Materiallar: chapda yangi material formasi, o'ngda guruh bo'yicha ro'yxat */
export function TeacherMaterialsPage() {
  const groups = useTeacherGroups()
  const lessons = useTeacherLessons()
  const materials = useTeacherMaterials()
  const [params, setParams] = useUrlState()
  // ?lesson=ID (Darslar sahifasidagi "Material qo'shish") yoki ?new=1 — oyna darhol ochiladi
  const [preset] = useState(() => Number(params.get('lesson')) || undefined)
  const [open, setOpen] = useState(() => Boolean(preset) || params.get('new') === '1')
  useEffect(() => {
    if (params.get('lesson') || params.get('new')) setParams({ lesson: null, new: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat birinchi ochilishda
  }, [])

  if (groups.isPending || lessons.isPending || materials.isPending)
    return <Skeleton active paragraph={{ rows: 10 }} />
  if (groups.isError) return <QueryError error={groups.error} onRetry={() => groups.refetch()} />
  if (lessons.isError) return <QueryError error={lessons.error} onRetry={() => lessons.refetch()} />
  if (materials.isError)
    return <QueryError error={materials.error} onRetry={() => materials.refetch()} />

  const groupList = groups.data
  const groupId = Number(params.get('group')) || (groupList.length === 1 ? groupList[0].id : 0)
  const lessonById = new Map(lessons.data.map((l) => [l.id, l]))
  const list = materials.data
    .filter((m) => !groupId || m.group_id === groupId)
    .sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)))

  const group = groupList.find((g) => g.id === groupId)

  return (
    <>
      <PageHeader
        eyebrow={`${group ? `${group.name} · ` : ''}${list.length} ta material`}
        title="Materiallar"
        subtitle="Dars slaydlari, audio, video va havolalar — talabalar o'z sahifasida ko'radi"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 44 }}
            onClick={() => setOpen(true)}
          >
            Material qo'shish
          </Button>
        }
      />

      {groupList.length > 1 && (
        <Segmented
          style={{ marginBottom: 16 }}
          value={groupId}
          onChange={(v) => setParams({ group: v || null })}
          options={[
            { value: 0, label: 'Barcha guruhlar' },
            ...groupList.map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
      )}

      {list.length === 0 ? (
        <div className="ee-panel">
          <Empty description="Hali material qo'shilmagan">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Birinchi materialni qo'shish
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="ee-group-grid">
          {list.map((m) => (
            <MaterialCard key={m.id} material={m} lesson={lessonById.get(m.lesson)} />
          ))}
        </div>
      )}

      <CreateMaterialForm
        open={open}
        onClose={() => setOpen(false)}
        lessons={lessons.data}
        defaultLesson={preset}
      />
    </>
  )
}

function MaterialCard({ material, lesson }: { material: LessonMaterial; lesson?: Lesson }) {
  const remove = useDeleteMaterial()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  return (
    <article className="ee-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Flex justify="space-between" align="flex-start" gap={12}>
        <Flex vertical gap={4} style={{ minWidth: 0 }}>
          <span className="ee-eyebrow">
            {material.group_name} ·{' '}
            {lesson ? `${lesson.lesson_number}-dars — ${lesson.title}` : material.lesson_title}
          </span>
          <h2 className="ee-heading" style={{ overflowWrap: 'anywhere' }}>
            {material.title}
          </h2>
        </Flex>
        <DeleteButton
          title="Materialni o'chirasizmi?"
          description="Talabalar uni boshqa ko'ra olmaydi."
          onConfirm={() =>
            remove
              .mutateAsync(material.id)
              .then(() => message.success("Material o'chirildi"))
              .catch(handleError)
          }
        />
      </Flex>
      {material.description && (
        <p style={{ margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
          {material.description}
        </p>
      )}
      {material.resources.length > 0 && (
        <Flex vertical gap={8}>
          {material.resources.map((r) => {
            const href = r.file || r.url
            if (!href) return null
            return (
              <a key={r.id} href={href} target="_blank" rel="noreferrer" className="ee-resource">
                {r.file ? <PaperClipOutlined /> : <LinkOutlined />}
                <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.file ? fileName(r.file) : r.url?.replace(/^https?:\/\//, '')}
                </strong>
                {r.file && (
                  <span className="ee-muted" style={{ marginLeft: 'auto' }}>
                    {r.file.split('.').pop()?.toUpperCase()}
                  </span>
                )}
              </a>
            )
          })}
        </Flex>
      )}
      <span className="ee-muted ee-mono" style={{ fontSize: 12 }}>
        Qo'shildi {formatShortDateTime(material.created_at)}
      </span>
    </article>
  )
}

interface CreateValues {
  lesson: number
  title: string
  description?: string
  url?: string
}

function CreateMaterialForm({
  open,
  onClose,
  lessons,
  defaultLesson,
}: {
  open: boolean
  onClose: () => void
  lessons: Lesson[]
  defaultLesson?: number
}) {
  const [form] = Form.useForm<CreateValues>()
  const [file, setFile] = useState<File | null>(null)
  const create = useCreateMaterial()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  // Backend: material faqat o'tilgan darsga qo'shiladi; eng oxirgisi birinchi
  const done = useMemo(
    () => lessons.filter((l) => lessonState(l) === 'done').sort(byDateDesc),
    [lessons],
  )
  const initialValues = useMemo<Partial<CreateValues>>(
    () => ({
      lesson: done.some((l) => l.id === defaultLesson) ? defaultLesson : done[0]?.id,
    }),
    [done, defaultLesson],
  )

  const close = () => {
    setFile(null)
    onClose()
  }

  const onSubmit = (v: CreateValues) => {
    const url = v.url?.trim() ?? ''
    if (!file && !url) {
      message.error('Fayl yuklang yoki havola kiriting')
      return
    }
    create.mutate(
      {
        lesson: v.lesson,
        title: v.title.trim(),
        description: v.description?.trim() ?? '',
        file,
        url,
      },
      {
        onSuccess: () => {
          message.success("Material qo'shildi — talabalar ko'ra oladi")
          close()
        },
        onError: (e) => handleError(e, form),
      },
    )
  }

  return (
    <FormDrawer<CreateValues>
      open={open}
      title="Yangi material"
      form={form}
      initialValues={initialValues}
      onClose={close}
      onSubmit={onSubmit}
      submitting={create.isPending}
      submitText="Qo'shish"
      width={520}
    >
      <Form.Item
        name="lesson"
        label="Dars"
        extra="Faqat o'tilgan darslar"
        rules={[{ required: true, message: 'Darsni tanlang' }]}
      >
        <Select
          placeholder={done.length ? 'Darsni tanlang' : "O'tilgan dars yo'q"}
          options={done.map((l) => ({ value: l.id, label: lessonLabel(l) }))}
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      <Form.Item
        name="title"
        label="Sarlavha"
        rules={[{ required: true, whitespace: true, message: 'Sarlavha kiriting' }, { max: 200 }]}
      >
        <Input maxLength={200} placeholder="Unit 3 — slaydlar" />
      </Form.Item>
      <Form.Item name="description" label="Tavsif">
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Qisqa izoh" />
      </Form.Item>
      <div className="ee-field" style={{ marginBottom: 12 }}>
        <span className="ee-field__label">Fayl</span>
        <FileDrop
          value={file}
          onChange={setFile}
          onInvalid={(t) => message.error(t)}
          accept={ACCEPT}
          maxMb={MAX_MB}
          title="Fayl yuklash"
          hint="hujjat, taqdimot, rasm, audio yoki video"
          disabled={create.isPending}
        />
      </div>
      <Form.Item
        name="url"
        label="Yoki havola"
        extra="Fayl yoki havoladan bittasi kifoya"
        rules={[{ type: 'url', message: "To'liq havola kiriting: https://…" }]}
        style={{ marginBottom: 0 }}
      >
        <Input placeholder="https://" inputMode="url" />
      </Form.Item>
    </FormDrawer>
  )
}
