import { CloseOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Input, InputNumber, Skeleton, Tooltip } from 'antd'
import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import type { ExamQuestion } from '@/shared/api/generated/model'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { useUrlState } from '@/shared/lib/useUrlState'
import { QueryError } from '@/shared/ui'
import { optionLetter } from '@/shared/ui/exam'

import {
  useDeleteQuestion,
  useExamQuestions,
  useSaveQuestion,
  useTeacherAttempts,
  useTeacherExam,
  type OptionDraft,
  type QuestionDraft,
} from '../api'

const NEW = 'new'
const QUESTION_MAX = 256
const OPTION_MAX = 512
const FILE_MAX_MB = 10

let keySeq = 0
const nextKey = () => `n${++keySeq}`

function toDraft(q: ExamQuestion): QuestionDraft {
  return {
    id: q.id,
    key: `q${q.id}`,
    question: q.question,
    points: q.points ?? 1,
    fileUrl: q.file ?? null,
    file: null,
    options: q.answers.map((a) => ({
      id: a.id,
      key: `a${a.id}`,
      answer: a.answer,
      is_correct: !!a.is_correct,
    })),
  }
}

function newDraft(points: number): QuestionDraft {
  return {
    key: NEW,
    question: '',
    points,
    fileUrl: null,
    file: null,
    options: [
      { key: nextKey(), answer: '', is_correct: false },
      { key: nextKey(), answer: '', is_correct: false },
    ],
  }
}

/** Saqlashga ta'sir qiladigan qismlar — "o'zgarganmi" solishtirish uchun */
const snapshot = (d: QuestionDraft) =>
  JSON.stringify([
    d.question,
    d.points,
    !!d.file,
    d.options.map((o) => [o.id, o.answer, o.is_correct]),
  ])

/** Backend tekshirmaydigan qoidalar: kamida 2 variant va aniq bitta to'g'ri javob */
function validate(d: QuestionDraft): string[] {
  const errors: string[] = []
  if (!d.question.trim()) errors.push('Savol matnini kiriting.')
  if (!d.points || d.points < 1) errors.push("Ball kamida 1 bo'lsin.")
  const filled = d.options.filter((o) => o.answer.trim())
  if (filled.length < 2) errors.push("Kamida 2 ta variant bo'lishi kerak.")
  if (d.options.some((o) => !o.answer.trim()))
    errors.push("Bo'sh variantlarni to'ldiring yoki o'chiring.")
  const correct = d.options.filter((o) => o.is_correct).length
  if (correct !== 1) errors.push("Aniq bitta to'g'ri javobni belgilang.")
  return errors
}

/** Dizayndagi "O'qituvchi · Savollar va variantlar" */
export function QuestionBuilderPage() {
  const examId = Number(useParams().id)
  const exam = useTeacherExam(examId)
  const questions = useExamQuestions(examId)

  if (exam.isPending || questions.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (exam.isError) return <QueryError error={exam.error} onRetry={() => exam.refetch()} />
  if (questions.isError)
    return <QueryError error={questions.error} onRetry={() => questions.refetch()} />

  return (
    <Builder
      examId={examId}
      examName={exam.data.name}
      passing={exam.data.passing_score ?? 0}
      questions={questions.data}
    />
  )
}

function Builder({
  examId,
  examName,
  passing,
  questions,
}: {
  examId: number
  examName: string
  passing: number
  questions: ExamQuestion[]
}) {
  const { message, modal } = App.useApp()
  const handleError = useApiErrorHandler()
  const [params, setParams] = useUrlState()
  const save = useSaveQuestion(examId)
  const remove = useDeleteQuestion(examId)
  const attempts = useTeacherAttempts()
  const fileInput = useRef<HTMLInputElement>(null)

  const selectedParam = params.get('q')
  const selectedId = selectedParam === NEW ? NEW : Number(selectedParam) || questions[0]?.id || NEW
  const original = questions.find((q) => q.id === selectedId)

  // Qoralama: tanlangan savol o'zgarganda (yoki saqlangandan keyin server ma'lumoti yangilanganda) qayta quriladi
  const base = useMemo(
    () => (original ? toDraft(original) : newDraft(questions.at(-1)?.points ?? 1)),
    [original, questions],
  )
  const [draftState, setDraftState] = useState<{ base: QuestionDraft; draft: QuestionDraft }>({
    base,
    draft: base,
  })
  const draft = draftState.base === base ? draftState.draft : base
  if (draftState.base !== base) setDraftState({ base, draft: base })
  const setDraft = (update: (d: QuestionDraft) => QuestionDraft) =>
    setDraftState((s) => ({ base: s.base, draft: update(s.base === base ? s.draft : base) }))

  const dirty = selectedId === NEW || snapshot(draft) !== snapshot(base)
  const errors = validate(draft)
  const [showErrors, setShowErrors] = useState(false)

  const total = questions.reduce((sum, q) => sum + (q.points ?? 1), 0)
  const takenCount = (attempts.data ?? []).filter((a) => a.exam === examId).length

  /** Saqlanmagan o'zgarish bo'lsa — boshqa savolga o'tishdan oldin so'raymiz */
  const guard = (action: () => void) => {
    const touched =
      selectedId === NEW
        ? snapshot(draft) !== snapshot(newDraft(draft.points)) &&
          (draft.question.trim() !== '' || draft.options.some((o) => o.answer.trim()))
        : dirty
    if (!touched) return action()
    modal.confirm({
      title: "Saqlanmagan o'zgarishlar bor",
      content: "Savoldagi o'zgarishlar yo'qoladi. Davom etasizmi?",
      okText: 'Ha, tashlab ketish',
      cancelText: 'Qolish',
      onOk: action,
    })
  }

  const select = (id: number | typeof NEW) =>
    guard(() => {
      setShowErrors(false)
      setParams({ q: id })
    })

  const onSave = () => {
    if (errors.length) {
      setShowErrors(true)
      return
    }
    const cleaned: QuestionDraft = {
      ...draft,
      question: draft.question.trim(),
      options: draft.options.map((o) => ({ ...o, answer: o.answer.trim() })),
    }
    save.mutate(
      { draft: cleaned, original },
      {
        onSuccess: (id) => {
          message.success('Savol saqlandi')
          setShowErrors(false)
          setParams({ q: id })
        },
        onError: (error) => handleError(error),
      },
    )
  }

  const onDelete = () => {
    if (!original) {
      setParams({ q: null })
      return
    }
    modal.confirm({
      title: "Savolni o'chirasizmi?",
      content: takenCount
        ? `${takenCount} ta talaba bu imtihonni boshlagan — ularning javoblari ham o'chadi.`
        : "Savol va uning variantlari o'chadi.",
      okText: "O'chirish",
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true },
      onOk: () =>
        remove.mutateAsync(original.id).then(
          () => setParams({ q: null }),
          (e) => handleError(e),
        ),
    })
  }

  const setOption = (key: string, patch: Partial<OptionDraft>) =>
    setDraft((d) => ({
      ...d,
      options: d.options.map((o) =>
        o.key === key
          ? { ...o, ...patch }
          : // Bitta to'g'ri javob: yangisi belgilansa, qolganlari olinadi
            patch.is_correct
            ? { ...o, is_correct: false }
            : o,
      ),
    }))

  const navItems = [
    ...questions.map((q, i) => ({
      id: q.id as number | typeof NEW,
      n: i + 1,
      text: q.question,
      points: q.points ?? 1,
    })),
    ...(selectedId === NEW
      ? [
          {
            id: NEW as number | typeof NEW,
            n: questions.length + 1,
            text: draft.question || 'Yangi savol',
            points: draft.points,
          },
        ]
      : []),
  ]
  const currentN = navItems.find((i) => i.id === selectedId)?.n ?? questions.length + 1

  return (
    <Flex vertical gap={24}>
      <Flex justify="space-between" align="flex-end" gap={16} wrap>
        <Flex vertical gap={6}>
          <span className="ee-muted" style={{ fontSize: 13 }}>
            <Link to="/teacher/exams" style={{ color: 'inherit' }}>
              Imtihonlar
            </Link>{' '}
            / {examName} / Savollar
          </span>
          <h1 className="ee-title">Savollar va variantlar</h1>
        </Flex>
        <Flex align="center" gap={16} wrap>
          <span className="ee-mono" style={{ fontSize: 15 }}>
            <strong>{total}</strong> ball · o'tish {passing}
          </span>
          <Button
            type="primary"
            style={{ height: 44 }}
            loading={save.isPending}
            disabled={!dirty}
            onClick={onSave}
          >
            Saqlash
          </Button>
        </Flex>
      </Flex>

      {questions.length > 0 && passing > total && (
        <Alert
          type="warning"
          showIcon
          title={`O'tish bali (${passing}) savollar ballari yig'indisidan (${total}) katta — hozircha hech kim o'ta olmaydi.`}
        />
      )}
      {takenCount > 0 && (
        <Alert
          type="info"
          showIcon
          title={`${takenCount} ta talaba bu imtihonni boshlagan. Savollarni o'zgartirish ularning ballini qayta hisoblamaydi.`}
        />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <nav
          aria-label="Savollar ro'yxati"
          style={{
            flex: '1 1 280px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === selectedId ? 'true' : undefined}
              className={`ee-qitem${item.id === selectedId ? ' is-active' : ''}`}
              onClick={() => item.id !== selectedId && select(item.id)}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span className="ee-qitem__n">Savol {item.n}</span>
                <span className="ee-qitem__text">{item.text}</span>
              </span>
              <span className="ee-mono" style={{ fontSize: 13, flex: 'none' }}>
                {item.points}
              </span>
            </button>
          ))}
          {selectedId !== NEW && (
            <Button
              icon={<PlusOutlined />}
              style={{ marginTop: 8, borderStyle: 'dashed', height: 44 }}
              onClick={() => select(NEW)}
            >
              Savol qo'shish
            </Button>
          )}
        </nav>

        <section
          className="ee-panel"
          style={{
            flex: '999 1 560px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <Flex justify="space-between" align="center" gap={12}>
            <span className="ee-eyebrow">
              {selectedId === NEW
                ? `Yangi savol (${currentN})`
                : `Savol ${currentN} tahrirlanmoqda`}
            </span>
            <Button size="small" onClick={onDelete} loading={remove.isPending}>
              {selectedId === NEW ? 'Bekor qilish' : "O'chirish"}
            </Button>
          </Flex>

          <label className="ee-field">
            <span className="ee-field__label">Savol matni</span>
            <Input.TextArea
              value={draft.question}
              maxLength={QUESTION_MAX}
              showCount
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder="Choose the correct preposition: 'He is good ___ English.'"
              onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
            />
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            <label className="ee-field">
              <span className="ee-field__label">Ball</span>
              <InputNumber
                min={1}
                precision={0}
                value={draft.points}
                style={{ width: '100%' }}
                onChange={(v) => setDraft((d) => ({ ...d, points: v ?? 1 }))}
              />
            </label>
            <div className="ee-field">
              <span className="ee-field__label">Fayl (rasm yoki audio)</span>
              <Flex gap={8} align="center" style={{ minHeight: 40 }}>
                <Button icon={<PaperClipOutlined />} onClick={() => fileInput.current?.click()}>
                  {draft.file
                    ? 'Boshqa fayl'
                    : draft.fileUrl
                      ? 'Almashtirish'
                      : 'Ixtiyoriy — fayl tanlang'}
                </Button>
                {draft.file ? (
                  <span
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {draft.file.name}
                  </span>
                ) : (
                  draft.fileUrl && (
                    <a
                      href={draft.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontWeight: 700 }}
                    >
                      Joriy fayl
                    </a>
                  )
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*,audio/*,.pdf"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (!f) return
                    if (f.size > FILE_MAX_MB * 1024 * 1024) {
                      message.error(`Fayl hajmi ${FILE_MAX_MB} MB dan oshmasligi kerak.`)
                      return
                    }
                    setDraft((d) => ({ ...d, file: f }))
                  }}
                />
              </Flex>
            </div>
          </div>

          <Flex vertical gap={10}>
            <Flex justify="space-between" align="baseline" gap={12}>
              <span className="ee-field__label">Javob variantlari</span>
              <span className="ee-muted" style={{ fontSize: 13 }}>
                To'g'ri javobni belgilang
              </span>
            </Flex>
            {draft.options.map((o, i) => (
              <div key={o.key} className={`ee-optrow${o.is_correct ? ' is-correct' : ''}`}>
                <span className="ee-option__dot" aria-hidden>
                  {optionLetter(i)}
                </span>
                <Input
                  variant="borderless"
                  value={o.answer}
                  maxLength={OPTION_MAX}
                  placeholder={`${optionLetter(i)} variant`}
                  aria-label={`${optionLetter(i)} variant matni`}
                  onChange={(e) => setOption(o.key, { answer: e.target.value })}
                  style={{ flex: 1, minWidth: 0, paddingInline: 0 }}
                />
                <button
                  type="button"
                  aria-pressed={o.is_correct}
                  className={`ee-correct-btn${o.is_correct ? ' is-on' : ''}`}
                  onClick={() => setOption(o.key, { is_correct: true })}
                >
                  {o.is_correct ? "✓ To'g'ri" : "To'g'ri deb belgilash"}
                </button>
                <Tooltip title="Variantni o'chirish">
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    aria-label={`${optionLetter(i)} variantni o'chirish`}
                    disabled={draft.options.length <= 2}
                    onClick={() =>
                      setDraft((d) => ({ ...d, options: d.options.filter((x) => x.key !== o.key) }))
                    }
                  />
                </Tooltip>
              </div>
            ))}
            <Button
              icon={<PlusOutlined />}
              style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }}
              disabled={draft.options.length >= 8}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  options: [...d.options, { key: nextKey(), answer: '', is_correct: false }],
                }))
              }
            >
              Variant qo'shish
            </Button>
          </Flex>

          {showErrors && errors.length > 0 && (
            <Alert
              type="error"
              showIcon
              title="Saqlab bo'lmaydi"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              }
            />
          )}

          <Flex justify="flex-end" gap={8}>
            <Button type="primary" loading={save.isPending} disabled={!dirty} onClick={onSave}>
              {selectedId === NEW ? "Savolni qo'shish" : 'Saqlash'}
            </Button>
          </Flex>
        </section>
      </div>
    </Flex>
  )
}
