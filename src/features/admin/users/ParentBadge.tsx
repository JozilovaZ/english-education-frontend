import { Skeleton, Tooltip } from 'antd'

import { StatusTag, Tag } from '@/shared/ui'

import { useParentStatus } from '../api'

/** Talaba ota-onasining Telegram botga ulanish holati (404 — ota-ona biriktirilmagan) */
export function ParentBadge({ userId }: { userId: number }) {
  const status = useParentStatus(userId)

  if (status.isPending) return <Skeleton.Button active size="small" style={{ width: 90 }} />
  if (status.isError) return <Tag variant="neu">Ota-ona yo'q</Tag>

  const { full_name, phone } = status.data
  return (
    <Tooltip title={[full_name, phone].filter(Boolean).join(' · ') || undefined}>
      <span>
        <StatusTag kind="parentConnection" value={status.data.status} />
      </span>
    </Tooltip>
  )
}
