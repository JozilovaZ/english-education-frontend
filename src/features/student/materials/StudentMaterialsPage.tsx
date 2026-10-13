import { useQuery } from '@tanstack/react-query'
import { Empty, Flex, Input, Segmented, Skeleton } from 'antd'
import dayjs from 'dayjs'

import type { LessonMaterial, LessonMaterialResource } from '@/shared/api/generated/model'
import { listItems, type ListResponse } from '@/shared/api/list'
import { customInstance } from '@/shared/api/mutator'
import { formatShortDateTime } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { QueryError } from '@/shared/ui'

/** Backend talabaga faqat o'z guruhlari materiallarini qaytaradi */
function useMaterials() {
  return useQuery({
    queryKey: ['student', 'materials'],
    queryFn: () =>
      customInstance<ListResponse<LessonMaterial>>({
        url: '/LessonMaterial/',
        method: 'GET',
      }).then(listItems),
  })
}

const fileName = (url: string) => decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? url)

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  style: { flex: 'none' },
}

function ResourceLink({ resource }: { resource: LessonMaterialResource }) {
  const href = resource.file || resource.url
  if (!href) return null
  const isFile = !!resource.file
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="ee-resource"
      // Fayl — yuklab olinadi, havola — yangi oynada ochiladi
      download={isFile ? fileName(href) : undefined}
    >
      {isFile ? (
        <svg {...iconProps}>
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
      ) : (
        <svg {...iconProps}>
          <path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" />
        </svg>
      )}
      <strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {isFile ? fileName(href) : href.replace(/^https?:\/\//, '')}
      </strong>
      <span className="ee-muted" style={{ marginLeft: 'auto', flex: 'none' }}>
        {isFile ? href.split('.').pop()?.toUpperCase() : 'Havola'}
      </span>
    </a>
  )
}

/** Dars materiallari: guruh bo'yicha, yangisi tepada; qidiruv nomi va dars bo'yicha */
export function StudentMaterialsPage() {
  const materials = useMaterials()
  const [params, setParams] = useUrlState()

  if (materials.isPending) return <Skeleton active paragraph={{ rows: 8 }} />
  if (materials.isError)
    return <QueryError error={materials.error} onRetry={() => materials.refetch()} />

  const groups = [...new Map(materials.data.map((m) => [m.group_id, m.group_name]))]
  const groupId = Number(params.get('group')) || 0
  const q = (params.get('q') ?? '').toLowerCase()
  const list = materials.data
    .filter(
      (m) =>
        (!groupId || m.group_id === groupId) &&
        (!q || `${m.title} ${m.lesson_title} ${m.description ?? ''}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)))

  return (
    <Flex vertical gap={20}>
      <Flex vertical gap={6}>
        <span className="ee-eyebrow">{materials.data.length} ta material</span>
        <h1 className="ee-title">Materiallar</h1>
        <span className="ee-muted">O'tilgan darslardan o'qituvchi yuklagan fayl va havolalar</span>
      </Flex>

      {materials.data.length > 0 && (
        <Flex gap={12} wrap align="center">
          {/* Telefonda tugmalar sig'masa yonga suriladi */}
          {groups.length > 1 && (
            <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <Segmented
                value={groupId}
                onChange={(v) => setParams({ group: v || null })}
                options={[
                  { value: 0, label: 'Hammasi' },
                  ...groups.map(([value, label]) => ({ value, label })),
                ]}
              />
            </div>
          )}
          <Input.Search
            allowClear
            aria-label="Qidirish"
            placeholder="Material yoki dars nomi"
            defaultValue={params.get('q') ?? ''}
            onSearch={(v) => setParams({ q: v.trim() || null })}
            style={{ width: 280, maxWidth: '100%' }}
          />
        </Flex>
      )}

      {list.length === 0 ? (
        <div className="ee-panel">
          <Empty
            description={
              materials.data.length
                ? 'Hech narsa topilmadi'
                : "Hali material yo'q — o'qituvchi darsdan keyin shu yerga yuklaydi"
            }
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))',
            gap: 16,
          }}
        >
          {list.map((m) => (
            <article
              key={m.id}
              className="ee-panel"
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <Flex vertical gap={4}>
                <span className="ee-eyebrow">
                  {m.group_name} · {m.lesson_title}
                </span>
                <h2 className="ee-heading" style={{ overflowWrap: 'anywhere' }}>
                  {m.title}
                </h2>
              </Flex>
              {m.description && (
                <p style={{ margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                  {m.description}
                </p>
              )}
              {m.resources.length > 0 && (
                <Flex vertical gap={8}>
                  {m.resources.map((r) => (
                    <ResourceLink key={r.id} resource={r} />
                  ))}
                </Flex>
              )}
              <span className="ee-muted ee-mono" style={{ fontSize: 12, marginTop: 'auto' }}>
                {formatShortDateTime(m.created_at)}
              </span>
            </article>
          ))}
        </div>
      )}
    </Flex>
  )
}
