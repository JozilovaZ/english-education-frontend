# Frontend ish rejasi

Har bir bosqich uchun: **qaysi endpointlar**, **qanday ekranlar**, **e'tibor beriladigan detallar**
va **tayyor deb hisoblash shartlari**. Bosqichlar ketma-ket bajariladi, chunki keyingilari
oldingilarga tayanadi (masalan, davomat uchun guruh va darslar kerak).

Backenddagi muammolar alohida faylda: [BACKEND_ISSUES.md](./BACKEND_ISSUES.md).
Ba'zi bosqichlar o'sha muammolar tuzatilishini kutadi (⛔ belgisi bilan ko'rsatilgan).

---

## ✅ 0-bosqich. Poydevor (tayyor)

- Vite + React 19 + TypeScript (strict), `@/` alias.
- Ant Design 6 (o'zbekcha locale), TanStack Query, React Router, Zustand.
- `schema.yml` dan orval orqali tiplar va hooklar: `npm run api:generate`.
- Axios: `/api` prefiksi, `Bearer` token, 401 da refresh (bir vaqtda faqat bitta refresh),
  refresh ham eskirsa — logout va kesh tozalanadi.
- Xatolarni yagona formatga keltirish (`parseApiError`) va formaga bog'lash (`useApiErrorHandler`).
- Rolga qarab bo'limlar: `/platform`, `/admin`, `/teacher`, `/student` + himoyalangan routelar.
- Login (username yoki telefon), Profil, Parolni o'zgartirish sahifalari.
- Menyudagi yozilmagan sahifalar `PlaceholderPage` bilan ochiladi.

Haqiqiy backend bilan tekshirilgan (API darajasida): uchala rol bilan login, telefon bilan login,
noto'g'ri parol xabari, token refresh, boshqa tenant tokenini rad etish. Brauzerda hali ko'rilmagan.

---

## 1-bosqich. Lokal muhit va umumiy komponentlar

### ✅ 1.1. Backendni lokal ishga tushirish — [dev/backend/README.md](../dev/backend/README.md)
- PostgreSQL + Redis, `.env` to'ldirish, `migrate_schemas`, `owner_create` / `admin_create`.
- Tenant uchun domen: `niners.localhost` (port yozilmaydi — django-tenants portni olib tashlaydi).
- Public tenant domeni: `localhost`.
- Frontendni `http://niners.localhost:5173` orqali ochish (Chrome/Edge `*.localhost` ni o'zi taniydi).

**Tekshirish:** login → token keladi → `/User/me/` 200 qaytaradi → 25 daqiqadan keyin
(yoki access tokenni qo'lda buzib) refresh ishlaydi → refresh buzilsa login sahifasiga qaytadi.

### ✅ 1.2. Umumiy komponentlar (`src/shared/ui`, `src/shared/lib`)

| Komponent / funksiya | Vazifasi |
|---|---|
| `PageHeader` | Sarlavha, izoh, breadcrumb, "orqaga" tugmasi, o'ngda tugmalar |
| `DataTable` + `useTableParams` | Qidiruv (400 ms kechikish bilan), backend saralash (`sortable: true` → `?ordering=`), sahifalash; holat URL'da. Loading, bo'sh holat va xato (403/404/qayta urinish) |
| `FormDrawer` + `useFormDrawer` | Yaratish/tahrirlash paneli; saqlanmagan o'zgarish bo'lsa yopishdan oldin so'raydi; `initialValues` **useMemo** bilan berilishi shart |
| `DeleteButton` | Tasdiq so'rab o'chirish; `ProtectedError` xabarini chaqiruvchi `handleError` bilan ko'rsatadi |
| `StatusTag`, `statusOptions` | Guruh, davomat, rol, ota-ona ulanishi, tenant holatlari — rang va o'zbekcha nom |
| `PhoneInput` + `phoneRules` | `90 123 45 67` ko'rinishida kiritiladi, formaga `+998901234567` qaytadi |
| `FileUpload` + `fileForSubmit` | Kengaytma va hajm tekshiruvi; qiymat `File` (yangi) / `string` (mavjud URL) / `null` |
| `QueryError` | So'rov xatosi: 403, 404 yoki "qayta urinish" |
| `format.ts` | Sana, vaqt, `DurationField` (`"90 00:00:00"` ↔ kun), pul (`450 000 so'm`), telefon, F.I.Sh. |
| `useUrlState`, `useUrlParams` | Filtrlarni URL query'da saqlash |

Namunaviy sahifa: **`/admin/courses`** (`src/features/courses/CoursesPage.tsx`). Yangi CRUD sahifa
shu sahifadan nusxa olib boshlanadi. Backendda tekshirilgan: multipart orqali yaratish/tahrirlash,
qidiruv, saralash, bog'langan kursni o'chirishda xabar, maydon xatosi input ostida.

### ✅ 1.3. Pagination (⛔ backend #9)
`src/shared/api/list.ts` dagi `SERVER_PAGINATION` flagi. Hozir `false` — sahifalash frontendda.
Backend `{count, results}` qaytara boshlagach `true` qilinadi, boshqa kod o'zgarmaydi
(`DataTable` va `listItems()` ikkala formatni ham tushunadi).

### ✅ 1.4. Kod bo'linishi
Har bir sahifa `React.lazy` bilan alohida chunk (`router.tsx` dagi `page()`), kutubxonalar alohida:
`antd` (~350 kB gzip), `react`, `vendor`. Ilova kodi ~12 kB.

### Menyu va ruxsat
`areas.tsx` dagi menyu bandiga `roles` berilsa, u boshqa rollarga ko'rinmaydi va URL orqali
kirilsa 403 sahifasi chiqadi (masalan, Kurslar — faqat SUPER_ADMIN).

**Brauzerda hali ko'rilmagan** (Chrome kengaytmasi ulanmagan) — 2-bosqichdan oldin vizual tekshiruv kerak.

---

## ✅ 1.5. Dizayn poydevori (uch rang)

Tanlangan ranglar: **#FFFFFF** (fon), **#141E33** (navy), **#E0662B** (apelsin). Qoidalar README'da.

- `src/app/palette.ts` — uch rang va ulardan aralashtirilgan tuslar (yorug'/qorong'i), `src/app/theme.ts` — antd mavzusi.
- `npm run lint` — palette.ts'dan tashqarida rang yozilsa xato; `npm run check:contrast` — 22 juftlik WCAG AA.
- Holat teglari 5 turga o'tkazildi, menyu navy + tanlangan band apelsin, mobil menyu (drawer), login qayta ishlandi.
- `/dev/ui` — komponentlar galereyasi; `scripts/screenshot.mjs` — yorug'/qorong'i/telefon skrinshotlari (login bilan ham).
- Tekshirilgan skrinshotlar: login (kompyuter, telefon, qorong'i), galereya (yorug', qorong'i, telefon),
  admin kurslar (yorug', qorong'i, telefon).

**Har bir yangi sahifa uchun:** `/dev/ui` dagi komponentlardan yig'iladi, oxirida 3 ta skrinshot
(1440 yorug', 1440 qorong'i, 390 telefon) ko'rib chiqiladi.

---

## 2-bosqich. Admin paneli (markaz ADMIN va SUPER_ADMIN)

> **Holat (2026-10-09):** tayyor — bosh sahifa (statistika, bugungi jadval, e'tibor kerak joylar),
> foydalanuvchilar (rol tablari, bloklash, ota-ona holati qator bo'yicha), guruhlar + `groups/:id`
> (talaba qo'shish/chiqarish, chiqqanlar tarixi, jadval, imtihonlar), haftalik dars jadvali
> (xona/guruh to'qnashuvi ogohlantirishi), ota-onalar (raqam o'zgarsa qayta ulanish ogohlantirishi,
> `VITE_TELEGRAM_BOT_URL`), imtihonlar (faqat ko'rish — admin natijalarni ko'ra olmaydi, backend
> `IsExamGroupTeacher`). ADMIN uchun kurs tanlovi mavjud guruhlardagi kurslardan olinadi (backend #6).
> Backendda ro'yxat filtrlari/qidiruv yo'q joylar (`/User/`, `/Parents/`) frontendda filtrlanadi.

### 2.1. Foydalanuvchilar — `/admin/users`
- Endpointlar: `GET/POST /User/`, `GET/PATCH/DELETE /User/{id}/`, `GET /User/{id}/parent-status/`.
- Jadval: F.I.Sh., login, telefon, rol, faol/nofaol, qo'shilgan sana. Rol bo'yicha tab yoki filtr.
- Yaratish formasi: `username`, `phone`, `password`, ism, familiya, email, `role`.
- **Detallar:**
  - ADMIN faqat TEACHER va STUDENT yarata/tahrirlay/o'chira oladi — boshqa rollar uchun
    tugmalarni yashirish (backend baribir 403 beradi).
  - SUPER_ADMIN yaratish taqiqlangan — rol select'ida ko'rsatilmaydi.
  - O'zini o'chirish tugmasi ko'rinmasin.
  - Talaba qatorida ota-ona holati badge: `connected` (yashil), `phone_only` (sariq — botga
    ulanmagan), `not_connected` (kulrang). N+1 bo'lmasligi uchun faqat detail sahifada yoki
    hover'da so'raladi.
  - `is_active=false` — "bloklash" sifatida ko'rsatiladi, o'chirishdan ko'ra afzal.

### 2.2. Kurslar — `/admin/courses` (⛔ backend #6, #10)
- Endpointlar: `/Educations/courses/` CRUD. Hozir faqat SUPER_ADMIN ko'radi.
- Forma: nom, tavsif, narx, davomiylik, darslar soni.
- **Detallar:** `duration` — Django `DurationField` (`"30 00:00:00"` = 30 kun yoki `"02:00:00"`).
  Formada "kun/oy" yoki "soat" ko'rinishida kiritib, formatga o'girish kerak — backend bilan
  nima ma'noda ekanini kelishib olish kerak (kurs davomiyligi kunlarda bo'lsa kerak).
  ADMIN uchun sahifa faqat o'qish rejimida yoki yashirin — backend javobiga qarab.

### 2.3. Guruhlar — `/admin/groups`, `/admin/groups/:id`
- Endpointlar: `/Educations/groups/` CRUD, `.../{id}/students/`, `.../{id}/add-student/`,
  `.../{id}/remove-student/`, `/Educations/groups/statistics/`.
- Ro'yxat filtrlari (backendda bor): `status`, `course`, `teacher`, `has_available_seats`,
  `is_full`, `start_date_from/to`, `search`, `ordering`.
- Detail sahifa tablari: **Ma'lumot**, **Talabalar**, **Dars jadvali**, **Imtihonlar**.
- **Detallar:**
  - `start_date` o'tgan kun bo'lishi mumkin emas (⛔ backend #19) — datepicker'da o'tgan kunlar o'chiriladi.
  - `end_date` foydalanuvchi kiritmaydi — status `completed/cancelled/paused` bo'lganda backend
    o'zi yozadi. Formada faqat ko'rsatiladi.
  - Sig'im: `active_students_count / capacity`, `available_seats` — progress bar.
    Guruh to'lgan bo'lsa "Talaba qo'shish" tugmasi o'chiriladi.
  - Sig'imni hozirgi talabalar sonidan kam qilib bo'lmaydi — backend xatosi formaga chiqadi.
  - Talaba qo'shish: faqat STUDENT rolidagi, shu guruhda faol bo'lmagan foydalanuvchilar
    (`/User/?role=STUDENT` filtri backendda yo'q — hozircha frontendda filtrlanadi).
  - Talabani chiqarish — `left_at` qo'yiladi (o'chirilmaydi), tarixda ko'rinadi.
  - O'qituvchi select'i — faqat TEACHER lar.
  - Kurs/o'qituvchi o'chirilsa `PROTECT` → "bog'langan ma'lumot bor" xabari.
  - Statistika — dashboard'da ishlatiladi (2.6).

### 2.4. Dars jadvali — `/admin/schedules`
- Endpointlar: `/Educations/schedules/` CRUD.
- Ko'rinish: haftalik jadval (ustunlar — kunlar, qatorlar — vaqt), filtr: guruh, xona.
- **Detallar:** `end_time > start_time` tekshiruvi frontendda; bitta xonada vaqt to'qnashuvini
  ogohlantirish (backend tekshirmaydi — faqat ogohlantirish).

### 2.5. Ota-onalar — `/admin/parents`
- Endpointlar: `/Parents/` CRUD (`full_name`, `phone`, `user`).
- **Detallar:**
  - `phone` tenant ichida unikal.
  - Telefon o'zgartirilsa backend `chat_id` ni o'chiradi — ota-ona botga qaytadan ulanishi
    kerak. Saqlashdan oldin shu haqida ogohlantirish.
  - Botga ulanish yo'riqnomasi: "Telegram botga /start bosing va kontaktingizni yuboring"
    (bot havolasini env orqali beramiz: `VITE_TELEGRAM_BOT_URL`).

### 2.6. Admin bosh sahifasi
- `/Educations/groups/statistics/` — holatlar bo'yicha guruhlar, talabalar soni,
  kurs va o'qituvchilar bo'yicha taqsimot (Recharts yoki antd Statistic kartalari).

### 2.7. Imtihonlar (admin ko'rinishi) — `/admin/exams`
- Admin barcha imtihonlarni ko'radi va boshqara oladi — UI o'qituvchinikini qayta ishlatadi (4.5).

**Tayyor sharti:** admin markazni to'liq sozlay oladi: o'qituvchi va talabalar yaratadi,
kurs → guruh → talabalar → jadval → ota-onalar.

---

## 3-bosqich. Platforma boshqaruvi (public SuperAdmin) — `/platform`

Faqat asosiy domenda (`localhost` / `example.uz`), `schema_name === 'public'`.

> **Holat (2026-10-09):** tayyor — statistika (KPI, oylik o'sish ustunli diagrammasi, rollar,
> tugayotgan obunalar, markazlar jadvali), markazlar ro'yxati (obuna filtrlari) va yaratish
> (nomdan schema/domen taklifi, band nomlar tekshiruvi, +1/3/6/12 oy), markaz sahifasi
> (statistika, foydalanuvchilar, admin qo'shish, schema nomini yozib o'chirish), domenlar
> (public domeni himoyalangan). Tayyor sharti tekshirildi: yangi markaz yaratildi va uning
> domenida admin bilan kirildi. Eslatma: markaz o'chirilganda backend schema'ni saqlab qoladi
> (`force_drop=False`).

### 3.1. Statistika — `/platform`
- `/PublicTenants/stats/overview/`, `.../user-growth/`, `.../roles/`, `.../tenants-summary/`.
- KPI kartalar (faol/nofaol/trial markazlar, foydalanuvchilar, o'sish %), o'sish grafigi,
  rollar diagrammasi, 7/30 kunda obunasi tugaydiganlar ro'yxati.

### 3.2. O'quv markazlari — `/platform/tenants`, `/platform/tenants/:id`
- `/PublicTenants/clients/` CRUD, `.../{id}/stats/`, `.../{id}/users/`, `.../{id}/create_admin/`.
- Filtrlar: `status` (active/inactive/trial/paid), `search`, `exclude_public=true` (doim).
- Yaratish formasi: nom, `schema_name`, `paid_until`, `on_trial`, domen va birinchi admin.
- **Detallar:**
  - `schema_name`: faqat kichik lotin harflar, raqam, `_`; band so'zlar (`public`, `admin`,
    `test`...) — frontendda ham tekshiriladi. Yaratilgach o'zgartirib bo'lmaydi.
  - Tenant yaratish sekin (schema + migratsiyalar) — tugmada loading, timeout'ni oshirish (60 s).
  - O'chirish: schema saqlanib qolishi haqida ogohlantirish; `public` o'chirilmaydi.
  - Obuna holati: `paid_until` o'tgan va `on_trial=false` → "Muddati tugagan" qizil teg.

### 3.3. Domenlar — `/platform/domains`
- `/PublicTenants/domains/` CRUD, `is_primary` belgisi; public domenini o'chirib bo'lmaydi.

**Tayyor sharti:** yangi markaz yaratib, uning domenida admin bilan login qilish mumkin.

---

## 4-bosqich. O'qituvchi paneli — `/teacher`

> **Holat (2026-10-07):** dizayn bo'yicha tayyor: imtihonlar (`/teacher/exams` — jadval + yaratish/tahrirlash),
> savollar muharriri (`exams/:id/questions` — 2+ variant va bitta to'g'ri javob tekshiruvi, saqlanmagan
> o'zgarish ogohlantirishi), natijalar (`/teacher/results?exam=` — statistika, filtr, topshirmaganlar),
> baholash (`results/:id` — to'g'ri javoblar, ball, sharh, ota-ona xabari ko'rinishi), uy vazifalari
> (`/teacher/homework` — yaratish + material, topshiriqlar, baholash). Headless Chrome'da to'liq oqim
> tekshirilgan.
> **2026-10-09:** 4.1 guruhlarim (kartochkalar + `groups/:id`: ma'lumot, jadval, talabalar, darslar tablari),
> 4.2 darslar (kelgusi/o'tilgan, drawer: keyingi raqam taklifi, takror raqam tekshiruvi, guruh sanalaridan
> tashqari kunlar o'chiq, jadvaldan vaqtni to'ldirish), 4.3 davomat (faqat boshlangan darslar, faqat
> o'zgargan qatorlar yuboriladi — backend har saqlashda ota-onaga qayta xabar yuboradi; saqlanmagan
> o'zgarish ogohlantirishi; telefonda qatorlar ustma-ust), 4.6 materiallar (faqat o'tilgan darslar,
> fayl va/yoki havola) tayyor. Skrinshotlarda tekshirilgan.
> Bosh sahifa (`/teacher`) ham tayyor: hozirgi/keyingi dars bloki, bugungi darslar, oxirgi 14 kunda
> davomati qilinmagan darslar, baholanmagan uy vazifalari, yaqin deadline'lar. **4-bosqich yakunlandi.**

### 4.1. Guruhlarim — `/teacher/groups`, `/teacher/groups/:id`
- `/Educations/teacher/groups/`, `.../{id}/`, `.../{id}/students/` (faqat o'qish).
- Detail sahifa — markaziy ekran: tablar **Talabalar**, **Darslar**, **Davomat**,
  **Uy vazifalari**, **Imtihonlar**. Pastdagi sahifalar shu tablar ichida ham ishlatiladi.

### 4.2. Darslar — `/teacher/lessons`
- `/Educations/lessons/` CRUD. Query: `group`, `date` (schema'da yo'q, lekin backend qabul qiladi —
  generatsiya qilingan tipga qo'shimcha param sifatida beriladi).
- **Detallar:**
  - `lesson_number` guruh ichida unikal — keyingi raqamni avtomatik taklif qilish.
  - Dars sanasi guruh `start_date` dan oldin bo'lmasin; `completed/cancelled` guruhga dars qo'shilmaydi.
  - Jadval (`Schedule`) asosida darslarni avtomatik to'ldirish — keyinroq, qulaylik uchun.

### 4.3. Davomat — `/teacher/attendance`
- `POST /Attendance/bulk-mark/` (`lesson`, `attendances: [{student, status, note}]`), `GET /Attendance/`.
- Ekran: dars tanlanadi → guruh talabalari ro'yxati → har biriga `present/absent/late/excused`
  (segmented tugmalar), izoh. "Hammasi keldi" tugmasi. Bitta "Saqlash".
- **Detallar:**
  - Oldin belgilangan davomat bo'lsa, forma u bilan to'ldiriladi (qayta saqlash = yangilash).
  - Saqlangach ota-onalarga Telegram xabar ketadi — buni foydalanuvchiga aytish
    ("ota-onalarga xabar yuborildi"). Tasodifiy ikki marta bosishdan himoya (tugma loading).
  - Guruhdan chiqqan talabalar ro'yxatda bo'lmasligi kerak.

### 4.4. Uy vazifalari — `/teacher/homework` (⛔ backend #3)
- `/Homework/` CRUD, `/Homework/resources/`, `/Homework/submissions/`,
  `POST /Homework/submissions/{id}/grade/` (`score`, `teacher_comment`).
- Ekranlar: vazifalar ro'yxati (dars bo'yicha) → vazifa sahifasi: resurslar + topshiriqlar jadvali
  (kim topshirdi / topshirmadi / baholandi) → baholash drawer'i.
- **Detallar:**
  - `score <= max_score` — formada `max` cheklovi.
  - Resurs: fayl (PDF/DOC/DOCX, ≤ 5 MB) **yoki** URL.
  - Deadline o'tgan topshiriqlar belgilanadi.
  - Baholash ota-onaga Telegram xabar yuboradi.

### 4.5. Imtihonlar — `/teacher/exams`, `/teacher/exams/:id`
- `/Exams/` CRUD, `/Exams/questions/`, `/Exams/answers/`, `GET /Exams/{id}/attempts/`,
  `POST /Exams/attempts/{id}/grade/`.
- Imtihon muharriri: savollar ro'yxati, har birida ball, fayl, variantlar va to'g'ri javob belgisi.
- **Detallar:**
  - Har bir savolda kamida 2 ta variant va **aniq bitta** to'g'ri javob bo'lishini frontend tekshiradi
    (backend tekshirmaydi).
  - `passing_score` ni `total_points` bilan solishtirib ogohlantirish (⛔ backend #13).
  - `duration` — `HH:MM:SS` formatda; formada "daqiqa" sifatida kiritiladi.
  - Imtihon boshlangandan keyin savollarni o'zgartirish xavfli — talabalar urinishi bo'lsa ogohlantirish.
  - Natijalar jadvali: talaba, ball / jami, %, o'tdi/o'tmadi, fayl, baholash tugmasi.

### 4.6. Materiallar — `/teacher/materials`
- `/LessonMaterial/` CRUD, `/LessonMaterial/resources/`.
- **Detal:** material faqat **o'tib bo'lgan** darsga qo'shiladi (backend `is_lesson_completed`) —
  kelajakdagi darslarni select'da o'chirib qo'yish.

**Tayyor sharti:** o'qituvchi bir darsni boshidan oxirigacha olib boradi: dars → davomat →
material → uy vazifasi → baholash; imtihon yaratadi va natijalarni ko'radi.

---

## 5-bosqich. O'quvchi paneli — `/student`

> **Holat (2026-10-07):** dizayn (claude.ai/artifact/Rnv7NsoZgwsTmrysv3iS89) bo'yicha imtihon qismi tayyor:
> bosh sahifa (`/student`), imtihonlar (`/student/exams`), boshlash + xato holatlari (`exams/:id`),
> ishlash (`exams/:id/take`, menyusiz to'liq ekran), natija (`exams/:id/result`), natijalar (`/student/results`).
> Brauzerda tekshirilgan (headless Chrome): boshlash → javob → sahifani yangilash (javoblar va taymer
> saqlanadi) → tasdiq → topshirish → natija; 1 daqiqalik imtihonda vaqt tugaganda avtomatik topshirish
> va javobsiz holatda "vaqt tugadi" kartochkasi. 5.2 uy vazifalari ham tayyor (`/student/homework?id=…`): ro'yxat + tanlangan vazifa, materiallar,
> topshirish (matn va/yoki PDF/DOC/DOCX ≤ 5 MB, tasdiq bilan), tekshirilmoqda / baholandi / muddati o'tgan
> holatlari — brauzerda tekshirilgan. Qolgani: 5.4 materiallar va davomat.

### 5.1. Bosh sahifa (⛔ backend #7)
- Yaqin deadline'lar (uy vazifasi + imtihonlar), oxirgi baholar, davomat foizi.
- Guruhlar va dars jadvali — backend endpoint qo'shilgach.

### 5.2. Uy vazifalari — `/student/homework`
- `GET /Homework/`, `GET /Homework/{id}/my-submission/`, `POST /Homework/submissions/`,
  `GET /Homework/submissions/my-submissions/`.
- Holatlar: topshirilmagan / topshirildi / baholandi / muddati o'tgan.
- Topshirish: matn javob va/yoki fayl. Deadline o'tgan bo'lsa forma yopiq.

### 5.3. Imtihon topshirish — `/student/exams`, `/student/exams/:id` (eng nozik qism)
- `POST /Exams/{id}/start/`, `POST /Exams/{id}/submit/`, `GET /Exams/{id}/my-attempt/`.
- Oqim: ro'yxat → "Boshlash" (tasdiq: "taymer ishga tushadi") → savollar sahifasi → "Topshirish" → natija.
- **Detallar:**
  - Taymer **faqat** `remaining_seconds` dan; har 60 soniyada yoki tab qayta faollashganda
    `my-attempt` dan sinxronlanadi. Brauzer soatiga ishonilmaydi.
  - Sahifa yangilansa: `start` qayta chaqiriladi — mavjud urinish 200 bilan qaytadi, davom etadi.
  - Javoblar `localStorage` da (`exam-{id}-answers`) saqlanadi — sahifa yangilansa yo'qolmaydi.
  - Vaqt 0 ga yetganda avtomatik topshirish; tarmoq xatosida qayta urinish.
  - Fayl + javoblar birga: multipart'da `answers[0]question_id` formatida (backend #5 shu bilan hal) —
    `submitExam()` fayl bo'lmasa JSON, bo'lsa multipart yuboradi.
  - Ikki marta topshirishdan himoya (tugma bloklanadi, `is_completed` tekshiriladi).
  - Sahifadan chiqib ketishda ogohlantirish (`beforeunload`).
  - Natija: ball, %, o'tdi/o'tmadi, o'qituvchi izohi; to'g'ri javoblar faqat yakunlangandan keyin.

### ✅ 5.4. Materiallar va davomat
> **2026-10-09:** tayyor. Materiallar — guruh filtri, qidiruv, fayl yuklab olish/havola. Davomatim —
> qatnashish foizi (kechikkan kelgan hisoblanadi, sababli foizga kirmaydi; backend `attendance_rate`
> faqat `present` ni sanaydi), holatlar bo'yicha sonlar va filtr. Dars sanasi javobda yo'q —
> `marked_at` ko'rsatiladi.
- `/LessonMaterial/` (faqat o'qish, fayllarni yuklab olish), `GET /Attendance/my-attendance/`
  (kalendar yoki jadval, foiz).

**Tayyor sharti:** talaba imtihonni topshiradi (sahifani yangilab ham), uy vazifasini yuklaydi,
baholarini ko'radi.

---

## 6-bosqich. Sifat va ishga tushirish

> **Holat (2026-10-09):**
> - `npm test` — Vitest, 46 test: `parseApiError`, sana/davomiylik formatlari, dars holati, davomat
>   (faqat o'zgargan qatorlar), jadval to'qnashuvi, obuna holati.
> - `npm run smoke` — ruxsatlar matritsasi: 5 rol (platforma, markaz egasi, ADMIN `manager1`, o'qituvchi,
>   talaba) × 40 sahifa; API 4xx/5xx, JS xatolari, xato ekranlari, gorizontal toshish. Kompyuter va
>   telefon (390 px) — ikkalasi toza. Topilgan: antd `Alert.message` eskirgan → `title`; telefonda
>   Segmented sahifani kengaytirardi → umumiy CSS qoidasi.
> - Build: antd chunk ~406 kB gzip — sahifalarga bo'lish sinab ko'rildi, foydasi ~13%, kesh yomonlashadi
>   (vite.config.ts izohi). Deploy: `deploy/nginx.conf` + README "Serverga joylash".
> - `npm run e2e` — Playwright (lokal Chrome, desktop + Pixel 7): talaba login formasi orqali kiradi →
>   imtihonni boshlaydi → javob beradi → sahifani yangilaydi (javoblar saqlanadi) → topshiradi → natija
>   2/3, "O'tdi" → qayta boshlab bo'lmaydi; noto'g'ri parol; talaba o'qituvchi bo'limiga kira olmaydi.
>   Imtihon testda o'qituvchi nomidan yaratiladi va `afterAll` da o'chiriladi. 6/6 o'tdi.
> - **Qolgan:** token refresh navbati testi, Sentry (ixtiyoriy).

- **Testlar:** Vitest + Testing Library — `parseApiError`, token refresh navbati, imtihon taymeri,
  davomat formasi. Playwright — login va imtihon topshirish oqimi (e2e).
- **Ruxsatlar matritsasi testi:** har bir rol bilan har bir menyu bandini ochib 403/bo'sh holat yo'qligini tekshirish.
- **Responsive:** talaba paneli telefonda to'liq ishlashi shart (imtihon, uy vazifasi).
  Admin/o'qituvchi — planshetdan katta ekranlar.
- **Deploy:** `npm run build` → `dist/` ni nginx beradi; nginx konfiguratsiyasi:
  - `location /api/ { proxy_pass http://django/; proxy_set_header Host $host; }` — `Host` saqlanadi.
  - `location /media/ { proxy_pass http://django; proxy_set_header Host $host; }`.
  - `location / { try_files $uri /index.html; }` — SPA routing.
  - Wildcard domen: `*.example.uz` → bitta frontend.
- **Monitoring:** Sentry (ixtiyoriy).

---

## Ishlash qoidalari

- Backend o'zgarsa: `schema.yml` ni `openapi/` ga ko'chirish → `npm run api:generate` →
  `npm run typecheck`. Tip xatolari — backend nimani o'zgartirganini ko'rsatadi.
- `src/shared/api/generated/` qo'lda tahrirlanmaydi.
- Har bir yangi sahifa: `src/features/<bo'lim>/` ichida, `src/app/router.tsx` dagi `AREA_PAGES` ga
  qo'shiladi; menyu `src/app/navigation/areas.tsx` da.
- Ruxsatni frontend faqat **qulaylik uchun** yashiradi — haqiqiy himoya backendda.
  403 kelsa xabar ko'rsatiladi, sahifa sinmaydi.
