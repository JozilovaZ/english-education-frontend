import type { ReactNode } from 'react'

import { Tag } from '../StatusTag'

interface ParentNoticeProps {
  studentName: string
  groupName: string
  examName: string
  teacherName: string
  score: number
  total: number
  passing: number
  passed: boolean
  comment?: string | null
}

/**
 * Ota-onaga Telegram orqali boradigan imtihon natijasi xabarining ko'rinishi
 * (haqiqiy matnni backend bot yuboradi — apps/exam/tasks.py). Ota-ona ismi va markaz nomi
 * frontendga kelmaydi, shuning uchun "Hurmatli ota-ona".
 */
export function ParentNotice({
  studentName,
  groupName,
  examName,
  teacherName,
  score,
  total,
  passing,
  passed,
  comment,
}: ParentNoticeProps) {
  const percent = Math.round((score / (total || 1)) * 1000) / 10
  const rows: [string, ReactNode][] = [
    ["O'quvchi", studentName],
    ['Guruh', groupName],
    ['Imtihon', examName],
    ["To'plangan ball", `${score} / ${total} (${percent}%)`],
    ["O'tish bali", `${passing} ball`],
    [
      'Holati',
      <Tag key="status" variant={passed ? 'pos' : 'neg'}>
        {passed ? "O'tdi" : "O'ta olmadi"}
      </Tag>,
    ],
    ["O'qituvchi", teacherName],
  ]
  if (comment) rows.push(['Sharh', comment])

  return (
    <div
      className="ee-sunken"
      style={{ padding: 16, fontSize: 14, lineHeight: '20px', maxWidth: 420 }}
    >
      <div
        className="ee-eyebrow"
        style={{
          color: 'var(--ee-text)',
          paddingBottom: 8,
          borderBottom: '1px solid var(--ee-border)',
        }}
      >
        Imtihon natijasi
      </div>
      <p style={{ margin: '12px 0' }}>
        Hurmatli ota-ona, farzandingiz {studentName} imtihonni topshirdi.
      </p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt className="ee-muted">{label}</dt>
            <dd
              style={{
                margin: 0,
                fontWeight: 500,
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-line',
              }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div
        className="ee-muted"
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: '1px solid var(--ee-border)',
          fontSize: 13,
        }}
      >
        Farzandingizning o'qish jarayonini doimiy kuzatib boring!
      </div>
    </div>
  )
}
