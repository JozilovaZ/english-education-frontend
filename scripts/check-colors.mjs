// Uch rang qoidasi nazorati: ranglar faqat src/app/palette.ts da yozilishi mumkin.
// Boshqa fayllarda hex (#fff, #E0662B), rgb()/rgba()/hsl() yoki antd'ning tayyor
// rang nomlari (color="green") topilsa — xato.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const ALLOWED = new Set(['app/palette.ts'])
const SKIP_DIRS = new Set(['generated'])

const RULES = [
  { re: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, msg: 'hex rang' },
  { re: /\b(?:rgba?|hsla?)\(/g, msg: 'rgb/hsl rang' },
  {
    re: /\bcolor=["'](?:green|red|blue|orange|gold|yellow|lime|cyan|purple|magenta|volcano|geekblue|success|processing|error|warning)["']/g,
    msg: "antd'ning tayyor rangi",
  },
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(full)
    } else if (/\.(tsx?|css)$/.test(name)) {
      yield full
    }
  }
}

let errors = 0
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).split(sep).join('/')
  if (ALLOWED.has(rel)) continue
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return // izohlar
    for (const { re, msg } of RULES) {
      re.lastIndex = 0
      const m = re.exec(line)
      if (m) {
        errors++
        console.error(
          `src/${rel}:${i + 1}  ${msg}: "${m[0]}" — rangni src/app/palette.ts dan oling`,
        )
      }
    }
  })
}

if (errors) {
  console.error(`\n${errors} ta xato. Uch rang qoidasi: barcha ranglar faqat palette.ts da.`)
  process.exit(1)
}
console.log('Ranglar: OK (faqat palette.ts)')
