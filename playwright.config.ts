import { defineConfig, devices } from '@playwright/test'

/**
 * E2E testlar (e2e/). Backend (dev/backend/start.ps1 + seed.py) va `npm run dev` ishlab turishi kerak —
 * testlar lokal test ma'lumotlari bilan ishlaydi va o'zlari yaratganini o'zlari o'chiradi.
 *
 * Brauzer yuklab olinmaydi: kompyuterdagi Google Chrome ishlatiladi (`channel: 'chrome'`).
 */
export default defineConfig({
  testDir: './e2e',
  // Testlar bir xil talaba hisobidan foydalanadi — ketma-ket
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Tenant domen bo'yicha aniqlanadi (README: "Tenant orqali kirish")
    baseURL: 'http://niners.localhost:5173',
    channel: 'chrome',
    locale: 'uz-UZ',
    timezoneId: 'Asia/Samarkand',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    // Talaba paneli telefonda to'liq ishlashi shart (PLAN 6-bosqich)
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
})
