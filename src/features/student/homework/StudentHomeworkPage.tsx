import { App, Button, Empty, Flex, Form, Grid, Input, Skeleton } from 'antd'
import { useRef, useState } from 'react'

import type { HomeworkResource } from '@/shared/api/generated/model'
import { formatShortDateTime, formatTimeLeft } from '@/shared/lib/format'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { FileDrop, PageHeader, QueryError, STATUS_MAPS, Tag } from '@/shared/ui'
import { Facts, ScoreBar } from '@/shared/ui/exam'

import {
  getHomeworkState,
  useMySubmission,
  useStudentHomework,
  useSubmitHomework,
  type StudentHomework,
} from './api'

/** Backend cheklovi bilan bir xil (apps/homework/validators.py) */
const ACCEPT = ['.pdf', '.doc', '.docx']
const MAX_MB = 5

/** Dizayndagi "Talaba · Uy vazifalari": chapda ro'yxat, o'ngda tanlangan vazifa */
export function StudentHomeworkPage() {
  const list = useStudentHomework()
  const [params, setParams] = useUrlState()
  const screens = Grid.useBreakpoint()
  const detailRef = useRef<HTMLElement>(null)

  const header = <PageHeader title="Uy vazifalari" />
  if (list.isPending)
    return (
      <>
        {header}
        <Skeleton active paragraph={{ rows: 8 }} />
      </>
    )
  if (list.isError)
    return (
      <>
        {header}
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      </>
    )

  const items = list.data
  if (items.length === 0)
    return (
      <>
        {header}
        <Empty description="Hozircha uy vazifalari yo'q" />
      </>
    )

  const selectedId = Number(params.get('id'))
  const current = items.find((h) => h.id === selectedId) ?? items[0]

  const select = (id: number) => {
    setParams({ id })
    // Telefonda ro'yxat tepada — tanlangan vazifaga tushamiz
    if (!screens.lg)
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <>
      {header}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <nav
          aria-label="Vazifalar"
          style={{
            flex: '1 1 320px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {items.map((hw, i) => {
            const group = SECTION[getHomeworkState(hw)]
            const prev = i > 0 ? SECTION[getHomeworkState(items[i - 1])] : null
            return (
              <Flex key={hw.id} vertical gap={10}>
                {/* Bo'lim sarlavhasi: holat o'zgargan joyda */}
                {group !== prev && (
                  <span className="ee-eyebrow" style={{ marginTop: i ? 12 : 0 }}>
                    {group}
                  </span>
                )}
                <HomeworkItem hw={hw} active={hw.id === current.id} onClick={() => select(hw.id)} />
              </Flex>
            )
          })}
        </nav>
        <section
          ref={detailRef}
          style={{
            flex: '999 1 560px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            scrollMarginTop: 80,
          }}
        >
          {/* key — boshqa vazifaga o'tilganda forma tozalanadi */}
          <HomeworkDetail key={current.id} hw={current} />
        </section>
      </div>
    </>
  )
}

const SECTION: Record<ReturnType<typeof getHomeworkState>, string> = {
  pending: 'Bajarish kerak',
  submitted: 'Topshirilgan',
  graded: 'Topshirilgan',
  overdue: "Muddati o'tgan",
}

function HomeworkStateTag({ hw }: { hw: StudentHomework }) {
  const state = getHomeworkState(hw)
  if (state === 'graded') return <Tag variant="pos">{hw.my_submission?.score ?? 0} ball</Tag>
  const meta = STATUS_MAPS.homework[state]
  return <Tag variant={meta.variant}>{meta.label}</Tag>
}

function HomeworkItem({
  hw,
  active,
  onClick,
}: {
  hw: StudentHomework
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`ee-list-item${active ? ' is-active' : ''}`}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%' }}>
        <strong style={{ fontSize: 15, textAlign: 'left', overflowWrap: 'anywhere' }}>
          {hw.title}
        </strong>
        <span style={{ flex: 'none' }}>
          <HomeworkStateTag hw={hw} />
        </span>
      </span>
      <span className="ee-mono" style={{ fontSize: 13, opacity: 0.8 }}>
        Muddat {formatShortDateTime(hw.deadline)}
        {getHomeworkState(hw) === 'pending' && formatTimeLeft(hw.deadline) && (
          <> · {formatTimeLeft(hw.deadline)}</>
        )}
      </span>
    </button>
  )
}

function fileName(url: string) {
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname.split('/').pop() ?? url)
  } catch {
    return url
  }
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  style: { flex: 'none' },
}

function ResourceLink({ resource }: { resource: HomeworkResource }) {
  const href = resource.file || resource.url
  if (!href) return null
  const isFile = !!resource.file
  const ext = isFile ? fileName(href).split('.').pop()?.toUpperCase() : null
  return (
    <a href={href} target="_blank" rel="noreferrer" className="ee-resource">
      {isFile ? (
        <svg {...iconProps}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
      ) : (
        <svg {...iconProps}>
          <path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" />
        </svg>
      )}
      <strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{resource.title}</strong>
      <span className="ee-muted" style={{ marginLeft: 'auto', flex: 'none' }}>
        {isFile ? ext : 'Havola'}
      </span>
    </a>
  )
}

function HomeworkDetail({ hw }: { hw: StudentHomework }) {
  const state = getHomeworkState(hw)
  const maxScore = hw.max_score ?? 100

  return (
    <>
      <div className="ee-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {hw.lesson_title && <span className="ee-eyebrow">{hw.lesson_title}</span>}
        <h2
          style={{
            margin: 0,
            font: '600 28px/34px var(--ee-font-serif)',
            overflowWrap: 'anywhere',
          }}
        >
          {hw.title}
        </h2>
        {hw.description && (
          <p style={{ margin: 0, fontSize: 16, lineHeight: '24px', whiteSpace: 'pre-line' }}>
            {hw.description}
          </p>
        )}
        <Facts
          size="sm"
          style={{
            paddingTop: 12,
            borderTop: '1px solid var(--ee-border)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, max-content))',
            columnGap: 32,
          }}
          items={[
            { label: 'Muddat', value: formatShortDateTime(hw.deadline) },
            { label: 'Maksimal ball', value: maxScore },
          ]}
        />
        {hw.resources.length > 0 && (
          <Flex vertical gap={8}>
            <span className="ee-eyebrow">Materiallar</span>
            {hw.resources.map((r) => (
              <ResourceLink key={r.id} resource={r} />
            ))}
          </Flex>
        )}
      </div>

      {state === 'graded' && hw.my_submission && (
        <div className="ee-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="ee-eyebrow">Sizning natijangiz</span>
          <ScoreBar score={hw.my_submission.score ?? 0} total={maxScore} />
          {hw.my_submission.teacher_comment && (
            <div className="ee-sunken" style={{ padding: 16 }}>
              <span className="ee-eyebrow">O'qituvchi sharhi</span>
              <p style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>
                {hw.my_submission.teacher_comment}
              </p>
            </div>
          )}
          <MySubmission homeworkId={hw.id} />
        </div>
      )}

      {state === 'submitted' && (
        <>
          <div className="ee-sunken" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <svg {...iconProps} width={22} height={22}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>
              Topshirildi ·{' '}
              <span className="ee-mono">{formatShortDateTime(hw.my_submission?.submitted_at)}</span>
              . O'qituvchi baholashini kuting — natija ota-onangizga ham yuboriladi.
            </span>
          </div>
          <div className="ee-panel">
            <MySubmission homeworkId={hw.id} />
          </div>
        </>
      )}

      {state === 'pending' && <SubmitForm hw={hw} />}

      {state === 'overdue' && (
        <div
          className="ee-panel"
          role="status"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            border: '1.5px dashed var(--ee-border-strong)',
          }}
        >
          <Flex justify="space-between" align="center" gap={12}>
            <h3 className="ee-heading" style={{ fontSize: 18 }}>
              Topshirish muddati tugagan
            </h3>
            <Tag variant="warn">Muddati o'tgan</Tag>
          </Flex>
          <p style={{ margin: 0, fontSize: 14 }}>
            Muddat ({formatShortDateTime(hw.deadline)}) o'tib ketgani uchun javob qabul qilinmaydi.
            Savol bo'lsa, o'qituvchingizga murojaat qiling.
          </p>
        </div>
      )}
    </>
  )
}

/** Topshirilgan javob matni va fayli */
function MySubmission({ homeworkId }: { homeworkId: number }) {
  const sub = useMySubmission(homeworkId, true)
  if (sub.isPending) return <Skeleton active paragraph={{ rows: 2 }} title={false} />
  if (sub.isError) return null
  const { answer, file } = sub.data
  if (!answer && !file) return null
  return (
    <Flex vertical gap={8}>
      <span className="ee-eyebrow">Sizning javobingiz</span>
      {answer && (
        <p style={{ margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{answer}</p>
      )}
      {file && (
        <a href={file} target="_blank" rel="noreferrer" className="ee-resource">
          <svg {...iconProps}>
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <path d="M14 3v6h6" />
          </svg>
          {/* Backend faylni uuid nom bilan saqlaydi — asl nom yo'q */}
          <strong>Yuklangan fayl</strong>
          <span className="ee-muted" style={{ marginLeft: 'auto' }}>
            {fileName(file).split('.').pop()?.toUpperCase()}
          </span>
        </a>
      )}
    </Flex>
  )
}

interface SubmitValues {
  answer?: string
}

function SubmitForm({ hw }: { hw: StudentHomework }) {
  const [form] = Form.useForm<SubmitValues>()
  const [file, setFile] = useState<File | null>(null)
  const { message, modal } = App.useApp()
  const handleError = useApiErrorHandler()
  const submit = useSubmitHomework()

  const onFinish = ({ answer = '' }: SubmitValues) => {
    const text = answer.trim()
    if (!text && !file) {
      form.setFields([{ name: 'answer', errors: ['Javob matnini yozing yoki fayl biriktiring.'] }])
      return
    }
    modal.confirm({
      title: 'Vazifani topshirasizmi?',
      content: "Topshirgandan keyin javobni o'zgartirib bo'lmaydi.",
      okText: 'Topshirish',
      cancelText: 'Qaytish',
      okButtonProps: { className: 'ee-btn-accent' },
      onOk: () =>
        submit.mutateAsync(
          { homework: hw.id, answer: text, file },
          {
            onSuccess: () => message.success("Vazifa topshirildi. O'qituvchi baholashini kuting."),
            onError: (error) => handleError(error, form),
          },
        ),
    })
  }

  return (
    <div
      className="ee-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        border: '2px solid var(--ee-text)',
      }}
    >
      <h3 className="ee-heading">Javobingizni topshiring</h3>
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="answer"
          label={
            <span className="ee-eyebrow" style={{ color: 'var(--ee-text)' }}>
              Javob matni
            </span>
          }
        >
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 14 }}
            placeholder="Javobingizni shu yerga yozing…"
            onChange={() => form.setFields([{ name: 'answer', errors: [] }])}
          />
        </Form.Item>
        <Form.Item name="file" style={{ marginBottom: 20 }}>
          <FileDrop
            value={file}
            onChange={(f) => {
              setFile(f)
              form.setFields([{ name: 'answer', errors: [] }])
            }}
            onInvalid={(text) => message.error(text)}
            accept={ACCEPT}
            maxMb={MAX_MB}
            title="Fayl biriktirish"
            hint="PDF, DOC, DOCX"
            disabled={submit.isPending}
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className="ee-btn-accent"
          style={{ height: 44 }}
          loading={submit.isPending}
        >
          Topshirish
        </Button>
      </Form>
    </div>
  )
}
