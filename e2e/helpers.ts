import { expect, type Browser, type Page } from '@playwright/test'

/** dev/backend/README.md dagi test foydalanuvchilari */
export const USERS = {
  teacher: { username: 'teacher1', password: 'test12345' },
  student: { username: 'student1', password: 'test12345' },
} as const

/** Login formasi orqali kirish (haqiqiy foydalanuvchi kabi) */
export async function loginViaForm(page: Page, user: { username: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Login yoki telefon raqam').fill(user.username)
  await page.getByLabel('Parol').fill(user.password)
  await page.getByRole('button', { name: 'Kirish' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

/**
 * Test ma'lumotlarini tayyorlash uchun API: so'rovlar brauzer ichidan `/api` orqali ketadi —
 * tenant Host bo'yicha aniqlanadi (Node `*.localhost` ni har doim ham taniy olmaydi).
 */
export class Api {
  private page: Page
  private token: string

  private constructor(page: Page, token: string) {
    this.page = page
    this.token = token
  }

  static async as(browser: Browser, user: { username: string; password: string }) {
    const page = await (await browser.newContext()).newPage()
    await page.goto('/login')
    const token = await page.evaluate(async (body) => {
      const res = await fetch('/api/User/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`login ${res.status}`)
      return ((await res.json()) as { access: string }).access
    }, user)
    return new Api(page, token)
  }

  async call<T>(method: string, url: string, body?: unknown): Promise<T> {
    return this.page.evaluate(
      async ({ method, url, body, token }) => {
        const res = await fetch(`/api${url}`, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`${method} ${url} → ${res.status}: ${await res.text()}`)
        return res.status === 204 ? null : res.json()
      },
      { method, url, body, token: this.token },
    ) as Promise<T>
  }

  async close() {
    await this.page.context().close()
  }
}

export interface TestExam {
  id: number
  name: string
  /** Har bir savolning to'g'ri va noto'g'ri variant matni */
  questions: { text: string; correct: string; wrong: string }[]
}

/** O'qituvchi nomidan GE-1 guruhiga 3 savolli (har biri 1 ball) imtihon yaratadi */
export async function createExam(teacher: Api, name: string): Promise<TestExam> {
  const groups = await teacher.call<{ id: number; name: string }[]>(
    'GET',
    '/Educations/teacher/groups/',
  )
  const group = groups.find((g) => g.name === 'GE-1') ?? groups[0]
  if (!group) throw new Error("O'qituvchida guruh yo'q — dev/backend/seed.py ni ishga tushiring")

  const exam = await teacher.call<{ id: number }>('POST', '/Exams/', {
    group: group.id,
    name,
    description: "Playwright e2e testi — avtomatik o'chiriladi",
    deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    duration: '00:30:00',
    passing_score: 2,
    is_active: true,
  })

  const questions = [
    { text: 'She ___ to school every day.', correct: 'goes', wrong: 'go' },
    { text: 'I have ___ apple.', correct: 'an', wrong: 'a' },
    { text: 'They ___ football yesterday.', correct: 'played', wrong: 'play' },
  ]
  for (const q of questions) {
    const created = await teacher.call<{ id: number }>('POST', '/Exams/questions/', {
      exam: exam.id,
      question: q.text,
      points: 1,
    })
    for (const [answer, is_correct] of [
      [q.correct, true],
      [q.wrong, false],
    ] as const) {
      await teacher.call('POST', '/Exams/answers/', { question: created.id, answer, is_correct })
    }
  }
  return { id: exam.id, name, questions }
}
