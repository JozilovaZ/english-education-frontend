// Vizual tekshiruv uchun skrinshot: haqiqiy qurilma emulyatsiyasi bilan (Chrome DevTools Protocol).
// Oddiy `chrome --headless --window-size=390,...` 504 px dan tor oynani qo'llamaydi — shuning uchun CDP.
//
// Ishlatish:
//   node scripts/screenshot.mjs <url> <chiqish.png> [--width=390] [--height=844] [--mobile] [--dark] [--full]
//   node scripts/screenshot.mjs http://niners.localhost:5173/login shots/login-m.png --width=390 --mobile
//   node scripts/screenshot.mjs http://niners.localhost:5173/admin/courses shots/c.png --login=admin:admin12345
//     --login — avval shu domenda test foydalanuvchi bilan kiradi (faqat lokal dev ma'lumotlari uchun)
//
// Talab: Chrome o'rnatilgan (CHROME_PATH bilan boshqa yo'l berish mumkin), Node 22+ (global WebSocket).
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const [url, out, ...flags] = process.argv.slice(2)
if (!url || !out) {
  console.error(
    'Ishlatish: node scripts/screenshot.mjs <url> <chiqish.png> [--width=N] [--height=N] [--mobile] [--dark] [--full]',
  )
  process.exit(1)
}
const opt = (name, def) => {
  const f = flags.find((x) => x.startsWith(`--${name}=`))
  return f ? Number(f.split('=')[1]) : def
}
const width = opt('width', 1440)
const height = opt('height', 900)
const mobile = flags.includes('--mobile')
const dark = flags.includes('--dark')
const full = flags.includes('--full')
const loginFlag = flags.find((x) => x.startsWith('--login='))
const credentials = loginFlag ? loginFlag.slice('--login='.length).split(':') : null

const chromePath =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome')

const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'ee-shot-'))
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch {
      /* Chrome hali ishga tushmagan */
    }
    await sleep(200)
  }
  throw new Error('Chrome DevTools ulanmadi')
}

try {
  const target = await getTarget()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)))
  let id = 0
  const pending = new Map()
  const events = []
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    } else if (msg.method) events.push(msg.method)
  }
  const send = (method, params = {}) =>
    new Promise((r) => {
      const n = ++id
      pending.set(n, r)
      ws.send(JSON.stringify({ id: n, method, params }))
    })

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
  })
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }],
  })
  const navigate = async (target) => {
    events.length = 0
    await send('Page.navigate', { url: target })
    for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await sleep(100)
  }

  if (credentials) {
    // Ilova bilan bir xil: /api/User/login/ → zustand persist formatida localStorage'ga
    await navigate(new URL('/login', url).href)
    const [username, password] = credentials
    const res = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `fetch('/api/User/login/', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(${JSON.stringify({ username, password })})})
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => { localStorage.setItem('ee-auth', JSON.stringify({ version: 0, state: {
          access: d.access, refresh: d.refresh, user: { id: d.id, role: d.role, schemaName: d.schema_name,
          username: d.username, phone: d.phone, firstName: d.first_name, lastName: d.last_name } } })); return 'ok' })`,
    })
    if (res.result?.result?.value !== 'ok')
      throw new Error('Login muvaffaqiyatsiz: ' + JSON.stringify(res.result))
  }

  await navigate(url)
  await sleep(2500) // lazy chunk'lar va shriftlar yuklanishi uchun

  const metrics = await send('Runtime.evaluate', {
    expression:
      'JSON.stringify({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight})',
    returnByValue: true,
  })
  const m = JSON.parse(metrics.result.result.value)
  if (m.sw > m.cw) console.warn(`DIQQAT: gorizontal toshish — sahifa ${m.sw}px, ekran ${m.cw}px`)

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: full,
    ...(full ? { clip: { x: 0, y: 0, width, height: m.sh, scale: 1 } } : {}),
  })
  mkdirSync(dirname(resolve(out)), { recursive: true })
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
  console.log(
    `${out}  (${width}×${full ? m.sh : height}${mobile ? ', mobil' : ''}${dark ? ", qorong'i" : ''})`,
  )
  ws.close()
} finally {
  chrome.kill()
}
