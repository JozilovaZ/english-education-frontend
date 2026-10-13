# English Education — Frontend

`english-education` (Django + django-tenants) backendi uchun React frontend.

- **Stack:** Vite, React 19, TypeScript, Ant Design 6, TanStack Query, React Router, Zustand, orval
- **Reja:** [docs/PLAN.md](docs/PLAN.md)
- **Backend muammolari:** [docs/BACKEND_ISSUES.md](docs/BACKEND_ISSUES.md)

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # kerak bo'lsa VITE_BACKEND_URL ni o'zgartiring
npm run dev
```

Backend `http://127.0.0.1:8000` da ishlab turishi kerak — ishga tushirish va test loginlar:
[dev/backend/README.md](dev/backend/README.md).

### Tenant (o'quv markazi) orqali kirish

Backend tenantni **domen** bo'yicha aniqlaydi, shuning uchun sayt `localhost:5173` orqali emas,
markaz domeni orqali ochiladi:

| Kim | Brauzerda ochiladigan manzil | Backenddagi `Domain` yozuvi |
|---|---|---|
| Platforma egasi (public) | `http://localhost:5173` | `localhost` |
| O'quv markazi | `http://niners.localhost:5173` | `niners.localhost` |

`*.localhost` manzillari brauzerda avtomatik `127.0.0.1` ga yo'naltiriladi, `hosts` faylini
o'zgartirish shart emas. Vite proxy `Host` headerini o'zgartirmasdan Django'ga uzatadi.

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Dev server (5173) |
| `npm run build` | Tip tekshiruvi + production build |
| `npm run typecheck` | Faqat TypeScript tekshiruvi |
| `npm run lint` | oxlint |
| `npm run format` | Prettier |
| `npm run api:generate` | `openapi/schema.yml` dan API client yaratish |
| `npm run check:contrast` | Palitradagi matn/fon juftliklarini WCAG AA bo'yicha tekshirish |
| `node scripts/screenshot.mjs <url> <png> [--width=390 --mobile --dark --full --login=user:parol]` | Vizual tekshiruv uchun skrinshot (qurilma emulyatsiyasi bilan) |
| `npm test` | Vitest: hisob-kitob mantig'i testlari (`*.test.ts`) |
| `npm run e2e` | Playwright: login va imtihon topshirish oqimi (kompyuter + telefon), kompyuterdagi Chrome bilan. Test o'z imtihonini yaratib, oxirida o'chiradi. Hisobot: `npx playwright show-report` |
| `npm run smoke [-- --mobile] [-- --only=teacher]` | Har bir rol bilan har bir sahifani ochib tekshirish: API xatolari, JS xatolari, "ruxsat yo'q" ekranlari, gorizontal toshish. Backend va `npm run dev` ishlab turishi kerak |

`npm run lint` rang qoidasini ham tekshiradi (`scripts/check-colors.mjs`).

## Serverga joylash (deploy)

```bash
npm ci && npm test && npm run build   # → dist/
```

`dist/` ni nginx beradi — namunaviy sozlama: [deploy/nginx.conf](deploy/nginx.conf).
Asosiy qoidalar:

- `/api/` → Django, prefiks olib tashlanadi, **`Host` o'zgarmasdan** uzatiladi (markaz domen bo'yicha aniqlanadi).
- `/media/` va `/static/` — nginx diskdan beradi (Django ularni faqat `DEBUG=True` da beradi).
- `/` → `try_files $uri /index.html` (SPA), `index.html` keshlanmaydi, `/assets/` abadiy keshlanadi.
- DNS va SSL: `example.uz` va `*.example.uz` bitta serverga; yangi markaz domeni qo'shilganda
  frontendni qayta build qilish shart emas.
- Django: `ALLOWED_HOSTS`, `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS` (fayl oxirida).

## API client

`openapi/schema.yml` — backenddagi `schema.yml` nusxasi. Backend o'zgarganda:

1. Yangi `schema.yml` ni `openapi/` ga ko'chiring (yoki backendda
   `python manage.py spectacular --file schema.yml`).
2. `npm run api:generate`
3. `npm run typecheck` — o'zgargan joylarni ko'rsatadi.

`src/shared/api/generated/` qo'lda tahrirlanmaydi. Hooklar shunday ishlatiladi:

```tsx
import { useEducationsGroupsList } from '@/shared/api/generated/endpoints/groups/groups'

const { data, isLoading } = useEducationsGroupsList({ status: 'active' })
```

## Tuzilma

```
src/
  app/          # App, router, layout, menyu (rollar bo'yicha), QueryClient
  features/     # auth, profile, keyinchalik: users, groups, exams ...
  pages/        # umumiy sahifalar (403, 404, placeholder)
  shared/
    api/        # axios (token + refresh), orval mutator, xatolarni o'qish, list (pagination), generated/
    lib/        # format (sana, pul, davomiylik), URL holati, xato handler
    ui/         # DataTable, FormDrawer, PageHeader, PhoneInput, FileUpload, StatusTag ...
```

## Dizayn: uch rang qoidasi

Butun interfeys faqat uchta rangdan: **oq `#FFFFFF`** (fon, ~60%), **navy `#141E33`** (matn, menyu, ~30%),
**apelsin `#E0662B`** (asosiy tugma, tanlangan element, e'tibor va salbiy holatlar, ~10%).
Qolgan tuslar shu uchtasini aralashtirib olinadi.

- Ranglar **faqat** `src/app/palette.ts` da. Boshqa joyda hex/rgb yoki `color="green"` yozilsa `npm run lint` xato beradi.
  Komponentlarda: antd token'lari yoki `var(--ee-accent)`, `var(--ee-text-2)` kabi CSS o'zgaruvchilar.
- Apelsin fonda matn **navy** (oq matn 3.4:1 — AA'dan o'tmaydi). Oq fonda apelsin matn kerak bo'lsa — `accentText` (`#AD542D`).
- Antd'ning success/info → navy, warning/error → apelsin (`src/app/theme.ts`). `darkAlgorithm` ishlatilmaydi — u apelsinni o'zgartiradi.
- Holatlar uchun yangi rang yo'q: `<StatusTag kind="group" value="active" />` — 5 tur (ijobiy, jarayonda, e'tibor, salbiy, betaraf),
  har birining o'z belgisi bor. Yangi holat → `src/shared/ui/statusMaps.ts`.
- Yorug' / qorong'i / tizim rejimi — header'dagi tugma. Shrift — Onest (loyiha ichida, `oʻ gʻ` va kirill bilan).
- Barcha komponentlar: **http://localhost:5173/dev/ui** (faqat dev rejimida).

## Yangi CRUD sahifa qo'shish

1. `src/features/courses/CoursesPage.tsx` dan nusxa oling — u barcha umumiy komponentlarni ishlatadi.
2. `src/app/router.tsx` → `AREA_PAGES` ga `page(() => import(...), 'NomPage')` qo'shing.
3. Menyuda bo'lmasa `src/app/navigation/areas.tsx` ga band qo'shing (kerak bo'lsa `roles` bilan).

## Rollar va bo'limlar

| Login javobi | Bo'lim |
|---|---|
| `schema_name = public`, `SUPER_ADMIN` | `/platform` |
| tenant, `SUPER_ADMIN` yoki `ADMIN` | `/admin` |
| tenant, `TEACHER` | `/teacher` |
| tenant, `STUDENT` | `/student` |
