import { expect, test } from '@playwright/test'

import { Api, createExam, loginViaForm, USERS, type TestExam } from './helpers.ts'

/**
 * Eng nozik oqim (PLAN 5.3): talaba imtihonni boshlaydi → javob beradi → sahifani yangilaydi
 * (javoblar saqlanib qolishi kerak) → topshiradi → natijani ko'radi → qayta topshira olmaydi.
 *
 * Har bir loyiha (desktop/mobile) o'z imtihonini yaratadi va oxirida o'chiradi.
 */
test.describe('Talaba: imtihon topshirish', () => {
  let teacher: Api
  let exam: TestExam

  test.beforeAll(async ({ browser }, info) => {
    teacher = await Api.as(browser, USERS.teacher)
    exam = await createExam(teacher, `E2E ${info.project.name} ${Date.now()}`)
  })

  test.afterAll(async () => {
    // Urinishlar ham imtihon bilan birga o'chadi
    if (exam) await teacher.call('DELETE', `/Exams/${exam.id}/`)
    await teacher?.close()
  })

  test('boshlash, javoblar yangilashdan keyin saqlanadi, topshirish va natija', async ({
    page,
  }) => {
    await loginViaForm(page, USERS.student)
    await expect(page).toHaveURL(/\/student/)

    // Imtihonlar ro'yxatida yangi imtihon ko'rinadi
    await page.goto('/student/exams')
    const card = page.locator('article', {
      has: page.getByRole('heading', { name: exam.name }),
    })
    await card.getByRole('button', { name: 'Boshlash' }).click()
    await expect(page).toHaveURL(new RegExp(`/student/exams/${exam.id}$`))

    await page.getByRole('button', { name: 'Imtihonni boshlash' }).click()
    await expect(page).toHaveURL(new RegExp(`/student/exams/${exam.id}/take$`))

    const [q1, q2, q3] = exam.questions
    // Variant aniq matni bo'yicha ("a" va "an" adashmasligi uchun)
    const option = (n: number, text: string) =>
      page
        .getByRole('radiogroup', { name: `${n}-savol variantlari` })
        .locator('label', {
          has: page.locator('.ee-option__text', { hasText: new RegExp(`^${text}$`) }),
        })
        .getByRole('radio')

    // 1 — to'g'ri, 2 — noto'g'ri
    await option(1, q1.correct).check()
    await option(2, q2.wrong).check()

    // Sahifa yangilansa ham javoblar va imtihon holati saqlanadi
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/student/exams/${exam.id}/take$`))
    await expect(option(1, q1.correct)).toBeChecked()
    await expect(option(2, q2.wrong)).toBeChecked()

    // 3 — to'g'ri; jami 2 ball = o'tish bali
    await option(3, q3.correct).check()

    await page.getByRole('button', { name: 'Imtihonni topshirish' }).click()
    const dialog = page.getByRole('dialog', { name: 'Imtihonni topshirasizmi?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Topshirish' }).click()

    await expect(page).toHaveURL(new RegExp(`/student/exams/${exam.id}/result$`))
    const score = page.getByRole('meter', { name: "To'plangan ball" })
    await expect(score).toHaveAttribute('aria-valuenow', '2')
    await expect(score).toHaveAttribute('aria-valuemax', '3')
    await expect(page.getByText("O'tdi", { exact: true }).first()).toBeVisible()

    // Topshirilgan imtihonni qayta boshlab bo'lmaydi
    await page.goto(`/student/exams/${exam.id}`)
    await expect(page.getByText('Allaqachon topshirilgan')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Imtihonni boshlash' })).toHaveCount(0)
  })
})

test("noto'g'ri parol bilan kirib bo'lmaydi", async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Login yoki telefon raqam').fill(USERS.student.username)
  await page.getByLabel('Parol').fill('noto-g-ri-parol')
  await page.getByRole('button', { name: 'Kirish' }).click()
  await expect(page.getByText(/parol noto'g'ri/i).first()).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test("talaba o'qituvchi bo'limiga kira olmaydi", async ({ page }) => {
  await loginViaForm(page, USERS.student)
  await page.goto('/teacher')
  await expect(page).not.toHaveURL(/\/teacher/)
})
