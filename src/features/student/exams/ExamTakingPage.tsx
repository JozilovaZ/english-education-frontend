import { App, Button, Flex, Grid, Skeleton } from 'antd'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'

import { parseApiError } from '@/shared/api/errors'
import type { ExamAttemptDetail } from '@/shared/api/generated/model'
import { durationToSeconds } from '@/shared/lib/format'
import { useCountdown } from '@/shared/lib/useCountdown'
import { FileDrop, QueryError } from '@/shared/ui'
import { AnswerOption, optionLetter, Timer } from '@/shared/ui/exam'

import { useMyAttempt, useStartExam, useStudentExam, useSubmitExam } from './api'
import type { StudentExam, StudentQuestion } from './types'

/** Taymerni server bilan sinxronlash oralig'i */
const SYNC_MS = 60_000
/** Tarmoq xatosida avtomatik qayta urinishlar */
const MAX_RETRIES = 3

type Answers = Record<number, number>

const storageKey = (id: number) => `exam-${id}-answers`

/** Javoblar shu qurilmada saqlanadi — sahifa yangilansa yo'qolmaydi */
function loadAnswers(id: number): Answers {
  try {
    const raw = localStorage.getItem(storageKey(id))
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Answers) : {}
  } catch {
    return {}
  }
}

function saveAnswers(id: number, answers: Answers | null) {
  try {
    if (answers) localStorage.setItem(storageKey(id), JSON.stringify(answers))
    else localStorage.removeItem(storageKey(id))
  } catch {
    // Saqlab bo'lmasa (yashirin rejim) — javoblar faqat xotirada qoladi
  }
}

const isImage = (url: string) => /\.(png|jpe?g|gif|webp)$/i.test(url)

/**
 * Imtihonni ishlash. Oqim:
 *  1. `start` (takror chaqirish xavfsiz — mavjud urinish qaytadi) → taymer.
 *  2. Savollar `GET /Exams/{id}/` dan; javoblar localStorage'da.
 *  3. Taymer `my-attempt` dan har 60 soniyada va tab qayta faollashganda sinxronlanadi.
 *  4. Vaqt 0 → avtomatik topshirish; tarmoq xatosida qayta urinish.
 */
export function ExamTakingPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { message } = App.useApp()
  const start = useStartExam()
  const startedRef = useRef(false)
  const [started, setStarted] = useState<ExamAttemptDetail | null>(null)

  useEffect(() => {
    // StrictMode effektni ikki marta ishga tushiradi — ikkinchi `start` so'rovi yuborilmaydi
    if (startedRef.current) return
    startedRef.current = true
    start.mutate(id, {
      onSuccess: setStarted,
      onError: (error) => {
        message.error(parseApiError(error).message)
        navigate(`/student/exams/${id}`, { replace: true })
      },
    })
  }, [id, start, message, navigate])

  const exam = useStudentExam(id, !!started)

  if (!started || exam.isPending) {
    return (
      <div className="ee-wrap">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  }
  if (exam.isError) {
    return (
      <div className="ee-wrap">
        <QueryError error={exam.error} onRetry={() => exam.refetch()} />
      </div>
    )
  }
  return <ExamSession exam={exam.data} started={started} />
}

function ExamSession({ exam, started }: { exam: StudentExam; started: ExamAttemptDetail }) {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const screens = Grid.useBreakpoint()
  const attempt = useMyAttempt(exam.id, true, SYNC_MS)
  const submit = useSubmitExam()

  const [answers, setAnswers] = useState<Answers>(() => loadAnswers(exam.id))
  const [file, setFile] = useState<File | null>(null)
  /** Sahifadan chiqishga ruxsat (topshirildi yoki yopildi) — blocker shuni o'qiydi */
  const leavingRef = useRef(false)
  const submittingRef = useRef(false)
  /** Ochiq tasdiq oynasi — vaqt tugaganda yopiladi */
  const confirmRef = useRef<{ destroy: () => void } | null>(null)
  /** Qayta urinish uchun eng so'nggi `send` (javoblar o'zgargan bo'lishi mumkin) */
  const sendRef = useRef<(auto: boolean, tries?: number) => void>(() => {})

  const serverSeconds = attempt.data?.remaining_seconds ?? started.remaining_seconds
  const left = useCountdown(serverSeconds, attempt.dataUpdatedAt)
  const total = exam.duration ? durationToSeconds(exam.duration) : started.remaining_seconds

  const questions = exam.questions
  const answered = questions.filter((q) => answers[q.id] !== undefined).length

  const pick = (questionId: number, optionId: number) =>
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionId }
      saveAnswers(exam.id, next)
      return next
    })

  const leave = useCallback(
    (to: string, state?: unknown) => {
      leavingRef.current = true
      navigate(to, { replace: true, state })
    },
    [navigate],
  )

  const send = useCallback(
    (auto: boolean, tries = 0) => {
      if (tries === 0 && submittingRef.current) return
      const payload = {
        id: exam.id,
        file,
        answers: questions.map((q) => ({ question_id: q.id, answer_id: answers[q.id] ?? null })),
      }
      if (answered === 0 && !file) {
        if (auto) {
          message.warning('Vaqt tugadi. Birorta javob berilmagani uchun imtihon topshirilmadi.')
          leave(`/student/exams/${exam.id}`)
        } else {
          message.warning('Kamida bitta savolga javob bering yoki yechim faylini yuklang.')
        }
        return
      }
      submittingRef.current = true
      submit.mutate(payload, {
        onSuccess: (res) => {
          saveAnswers(exam.id, null)
          leave(`/student/exams/${exam.id}/result`, { submitted: res.message })
        },
        onError: (error) => {
          // Internet uzilgan — javoblar yo'qolmasin, bir necha marta qayta urinamiz
          if (isAxiosError(error) && !error.response && tries < MAX_RETRIES) {
            message.warning("Server bilan aloqa yo'q. Qayta urinilmoqda…")
            window.setTimeout(() => sendRef.current(auto, tries + 1), 3000)
            return
          }
          submittingRef.current = false
          const { message: text } = parseApiError(error)
          if (isAxiosError(error) && error.response?.status === 400) {
            // Vaqt / deadline tugagan yoki allaqachon topshirilgan — holat sahifasiga
            message.error(text)
            leave(`/student/exams/${exam.id}`)
          } else {
            message.error(text)
          }
        },
      })
    },
    [answered, answers, exam.id, file, leave, message, questions, submit],
  )

  useEffect(() => {
    sendRef.current = send
  }, [send])

  // Vaqt tugadi → avtomatik topshirish
  useEffect(() => {
    if (left === 0 && !leavingRef.current && !submittingRef.current) {
      confirmRef.current?.destroy()
      message.info('Vaqt tugadi — javoblaringiz avtomatik topshirilmoqda.')
      send(true)
    }
  }, [left, message, send])

  // Boshqa tabda topshirilgan bo'lsa
  useEffect(() => {
    if (attempt.data?.is_completed && !leavingRef.current && !submittingRef.current) {
      leave(`/student/exams/${exam.id}`)
    }
  }, [attempt.data?.is_completed, exam.id, leave])

  // Brauzer tabini yopish / yangilashdan oldin ogohlantirish
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // Ilova ichidagi boshqa sahifaga o'tishdan oldin so'rash
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leavingRef.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    confirmRef.current = modal.confirm({
      title: 'Imtihondan chiqasizmi?',
      content:
        "Taymer to'xtamaydi. Javoblaringiz shu qurilmada saqlanadi — vaqt tugamaguncha qaytib kelib davom ettirishingiz mumkin.",
      okText: 'Chiqish',
      cancelText: 'Qolish',
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    })
  }, [blocker, modal])

  const confirmSubmit = () => {
    const missing = questions.length - answered
    confirmRef.current = modal.confirm({
      title: 'Imtihonni topshirasizmi?',
      content: (
        <>
          {missing > 0 && (
            <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
              {missing} ta savolga javob berilmagan.
            </p>
          )}
          Topshirgandan keyin javoblarni o'zgartirib bo'lmaydi. Natija ota-onangizga yuboriladi.
        </>
      ),
      okText: 'Topshirish',
      cancelText: 'Qaytish',
      okButtonProps: { className: 'ee-btn-accent' },
      onOk: () => send(false),
    })
  }

  const scrollTo = (n: number) =>
    document.getElementById(`q${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const answeredLabel = `${answered} / ${questions.length} ta savolga javob berildi`
  const timer = <Timer seconds={left ?? serverSeconds} total={total || 1} />

  const head = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span className="ee-eyebrow">{exam.group_name}</span>
      <strong style={{ font: '600 22px/28px var(--ee-font-serif)', overflowWrap: 'anywhere' }}>
        {exam.name}
      </strong>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ee-bg)' }}>
      {screens.lg ? (
        <aside
          className="ee-sider"
          style={{ position: 'sticky', top: 0, height: '100vh', width: 280, flex: 'none' }}
        >
          {head}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--ee-sider-text)' }}>{answeredLabel}</span>
            {timer}
          </div>
        </aside>
      ) : (
        <header
          className="ee-sider"
          style={{
            position: 'fixed',
            insetInline: 0,
            top: 0,
            zIndex: 10,
            height: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 12px 8px 16px',
          }}
        >
          {head}
          <div className="ee-timer-compact">{timer}</div>
        </header>
      )}

      <main
        className="ee-wrap"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 32,
          alignItems: 'flex-start',
          paddingTop: screens.lg ? undefined : 100,
        }}
      >
        <nav
          aria-label="Savollar"
          className="ee-sunken"
          style={{
            flex: '1 1 220px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 20,
            position: screens.lg ? 'sticky' : undefined,
            top: 32,
          }}
        >
          <span className="ee-eyebrow">Savollar</span>
          <div className="ee-qnav">
            {questions.map((q, i) => (
              <a
                key={q.id}
                href={`#q${i + 1}`}
                className={answers[q.id] !== undefined ? 'is-done' : undefined}
                aria-label={`${i + 1}-savol${answers[q.id] !== undefined ? ', javob berilgan' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo(i + 1)
                }}
              >
                {i + 1}
              </a>
            ))}
          </div>
          <div
            className="ee-muted"
            style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: 'var(--ee-accent)',
                  boxShadow: 'inset 0 0 0 1.5px var(--ee-text)',
                }}
              />
              Javob berilgan
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  boxShadow: 'inset 0 0 0 1.5px var(--ee-border-strong)',
                }}
              />
              Javob berilmagan
            </span>
          </div>
        </nav>

        <section
          style={{
            flex: '999 1 600px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              n={i + 1}
              total={questions.length}
              question={q}
              selected={answers[q.id]}
              onPick={(optionId) => pick(q.id, optionId)}
            />
          ))}

          <article
            className="ee-panel"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <span className="ee-eyebrow">Yozma qism · ixtiyoriy</span>
            <h2 style={{ margin: 0, font: '700 17px/24px var(--ee-font)' }}>
              Yechimni fayl sifatida yuklang
            </h2>
            <FileDrop
              value={file}
              onChange={setFile}
              onInvalid={(text) => message.error(text)}
              accept={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
              maxMb={10}
              hint="PDF, Word yoki rasm"
              disabled={submit.isPending}
            />
          </article>

          <div
            className="ee-sunken"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              padding: '20px 24px',
            }}
          >
            <span style={{ fontSize: 14 }}>
              Topshirgandan keyin javoblarni o'zgartirib bo'lmaydi. Natija ota-onangizga yuboriladi.
            </span>
            <Button
              type="primary"
              className="ee-btn-accent"
              style={{ height: 48, paddingInline: 28 }}
              loading={submit.isPending}
              onClick={confirmSubmit}
            >
              Imtihonni topshirish
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

function QuestionCard({
  n,
  total,
  question,
  selected,
  onPick,
}: {
  n: number
  total: number
  question: StudentQuestion
  selected: number | undefined
  onPick: (optionId: number) => void
}) {
  return (
    <article
      id={`q${n}`}
      className="ee-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 120 }}
    >
      <Flex justify="space-between" gap={12}>
        <span className="ee-eyebrow">
          Savol {n} / {total}
        </span>
        <span className="ee-mono ee-muted" style={{ fontSize: 13 }}>
          {question.points} ball
        </span>
      </Flex>
      <h2
        style={{
          margin: '0 0 4px',
          font: '700 17px/24px var(--ee-font)',
          overflowWrap: 'anywhere',
        }}
      >
        {question.question}
      </h2>
      {question.file &&
        (isImage(question.file) ? (
          <img
            src={question.file}
            alt={`${n}-savolga rasm`}
            style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--ee-border)' }}
          />
        ) : (
          <a href={question.file} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
            Savolga biriktirilgan fayl
          </a>
        ))}
      <div
        role="radiogroup"
        aria-label={`${n}-savol variantlari`}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {question.options.map((o, j) => (
          <AnswerOption
            key={o.id}
            name={`q${question.id}`}
            value={o.id}
            letter={optionLetter(j)}
            state={selected === o.id ? 'selected' : 'idle'}
            onSelect={() => onPick(o.id)}
          >
            {o.answer}
          </AnswerOption>
        ))}
      </div>
    </article>
  )
}
