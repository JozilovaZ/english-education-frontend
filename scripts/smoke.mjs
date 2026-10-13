// Ruxsatlar matritsasi / tutun testi: har bir rol bilan har bir sahifani ochib tekshiradi:
//   - API so'rovlari 4xx/5xx qaytarmaganmi (ParentBadge'dagi kutilgan 404 bundan mustasno)
//   - JS xatolari (uncaught exception, console.error)
//   - xato ekranlari: "Ruxsat yo'q", "Ma'lumotni yuklab bo'lmadi", 403/404 sahifalari, placeholder
//   - gorizontal toshish (sahifa ekrandan keng)
//
// Ishlatish (backend va `npm run dev` ishlab turgan bo'lishi kerak; faqat lokal test ma'lumotlari):
//   node scripts/smoke.mjs            — kompyuter (1440 px)
//   node scripts/smoke.mjs --mobile   — telefon (390 px)
//   node scripts/smoke.mjs --only=teacher
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const mobile = process.argv.includes('--mobile')
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const width = mobile ? 390 : 1440
const height = mobile ? 844 : 900
const PORT = 5173

/** dev/backend/README.md dagi test foydalanuvchilari */
const ROLES = [
  {
    name: 'platform',
    host: 'localhost',
    login: ['owner', 'owner12345'],
    pages: ['/platform', '/platform/tenants', '/platform/tenants/2', '/platform/domains'],
  },
  {
    name: 'admin',
    host: 'niners.localhost',
    login: ['admin', 'admin12345'],
    pages: [
      '/admin',
      '/admin/users',
      '/admin/courses',
      '/admin/groups',
      '/admin/groups/1',
      '/admin/groups/1?tab=schedule',
      '/admin/groups/1?tab=exams',
      '/admin/schedules',
      '/admin/parents',
      '/admin/exams',
      '/admin/profile',
    ],
  },
  {
    // Oddiy admin: kurslar menyuda yo'q (faqat SUPER_ADMIN), qolgani markaz egasi bilan bir xil
    name: 'manager',
    host: 'niners.localhost',
    login: ['manager1', 'test12345'],
    pages: [
      '/admin',
      '/admin/users',
      '/admin/groups',
      '/admin/groups/1',
      '/admin/schedules',
      '/admin/parents',
      '/admin/exams',
    ],
  },
  {
    name: 'teacher',
    host: 'niners.localhost',
    login: ['teacher1', 'test12345'],
    pages: [
      '/teacher',
      '/teacher/exams',
      '/teacher/results',
      '/teacher/homework',
      '/teacher/groups',
      '/teacher/groups/1',
      '/teacher/groups/1?tab=lessons',
      '/teacher/lessons',
      '/teacher/attendance',
      '/teacher/materials',
      '/teacher/profile',
    ],
  },
  {
    name: 'student',
    host: 'niners.localhost',
    login: ['student1', 'test12345'],
    pages: [
      '/student',
      '/student/exams',
      '/student/homework',
      '/student/results',
      '/student/materials',
      '/student/attendance',
      '/student/profile',
    ],
  },
]

/** Kutilgan xatolar: ota-onasi yo'q talabaning parent-status so'rovi 404 qaytaradi */
const EXPECTED = [/\/User\/\d+\/parent-status\/ → 404/]

const ERROR_TEXTS = [
  "Ruxsat yo'q",
  "Ma'lumotni yuklab bo'lmadi",
  'Topilmadi',
  "Bu bo'lim keyingi bosqichlarda yoziladi",
]

const chromePath =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function withChrome(fn) {
  const port = 9300 + Math.floor(Math.random() * 500)
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ee-smoke-'))}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  try {
    let target
    for (let i = 0; i < 50 && !target; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
        target = list.find((t) => t.type === 'page')
      } catch {
        /* Chrome hali ishga tushmagan */
      }
      if (!target) await sleep(200)
    }
    if (!target) throw new Error('Chrome DevTools ulanmadi')
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)))
    let id = 0
    const pending = new Map()
    const listeners = new Set()
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data)
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      } else if (msg.method) for (const l of listeners) l(msg)
    }
    const send = (method, params = {}) =>
      new Promise((r) => {
        const n = ++id
        pending.set(n, r)
        ws.send(JSON.stringify({ id: n, method, params }))
      })
    await fn({ send, listeners })
    ws.close()
  } finally {
    chrome.kill()
  }
}

const evaluate = async (send, expression) =>
  (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result
    ?.result?.value

let failed = 0

for (const role of ROLES.filter((r) => !only || r.name === only)) {
  await withChrome(async ({ send, listeners }) => {
    await send('Page.enable')
    await send('Network.enable')
    await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    })

    let problems = []
    let loaded = false
    listeners.add((msg) => {
      if (msg.method === 'Page.loadEventFired') loaded = true
      if (msg.method === 'Network.responseReceived') {
        const { url, status } = msg.params.response
        if (status >= 400 && url.includes('/api/')) {
          const line = `${new URL(url).pathname.replace(/^\/api/, '')} → ${status}`
          if (!EXPECTED.some((re) => re.test(line))) problems.push(`API ${line}`)
        }
      }
      if (msg.method === 'Runtime.exceptionThrown')
        problems.push(`JS ${msg.params.exceptionDetails.exception?.description?.split('\n')[0]}`)
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
        // React dev ogohlantirishlari ham xato sifatida chiqadi — ularni ham ko'rsatamiz
        problems.push(`console ${text.slice(0, 160)}`)
      }
    })

    const go = async (path) => {
      loaded = false
      await send('Page.navigate', { url: `http://${role.host}:${PORT}${path}` })
      for (let i = 0; i < 100 && !loaded; i++) await sleep(100)
    }

    await go('/login')
    const [username, password] = role.login
    const ok = await evaluate(
      send,
      `fetch('/api/User/login/', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(${JSON.stringify({ username, password })})})
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => { localStorage.setItem('ee-auth', JSON.stringify({ version: 0, state: {
          access: d.access, refresh: d.refresh, user: { id: d.id, role: d.role, schemaName: d.schema_name,
          username: d.username, phone: d.phone, firstName: d.first_name, lastName: d.last_name } } })); return 'ok' })
        .catch(e => 'fail ' + e)`,
    )
    if (ok !== 'ok') {
      console.log(`✕ ${role.name}: login muvaffaqiyatsiz (${ok})`)
      failed++
      return
    }

    for (const path of role.pages) {
      problems = []
      await go(path)
      await sleep(1800) // lazy chunk va so'rovlar
      const info = JSON.parse(
        await evaluate(
          send,
          `JSON.stringify({ path: location.pathname, text: document.body.innerText,
            sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })`,
        ),
      )
      const expectedPath = path.split('?')[0]
      if (info.path !== expectedPath) problems.push(`yo'naltirildi → ${info.path}`)
      for (const t of ERROR_TEXTS) if (info.text.includes(t)) problems.push(`ekranda: «${t}»`)
      if (info.sw > info.cw) problems.push(`gorizontal toshish ${info.sw}px > ${info.cw}px`)

      const unique = [...new Set(problems)]
      if (unique.length) {
        failed++
        console.log(`✕ ${role.name} ${path}`)
        for (const p of unique) console.log(`    ${p}`)
      } else {
        console.log(`✓ ${role.name} ${path}`)
      }
    }
  })
}

console.log(
  failed ? `\n${failed} ta muammo (${mobile ? 'telefon' : 'kompyuter'})` : '\nHammasi joyida',
)
process.exit(failed ? 1 : 0)
