# Backend dasturchisi uchun: frontendga ta'sir qiladigan muammolar

Backend repo: `english-education` (Django). Ro'yxat muhimlik tartibida.
Frontend tomonda vaqtinchalik yechim bo'lsa, u ham yozilgan.

## 🔴 Bloklovchi (frontend ishlamaydi yoki xavfsizlik teshigi)

### 1. `SECRET_KEY` har ishga tushganda yangidan generatsiya qilinadi
`core/settings.py:24` — `SECRET_KEY = get_random_secret_key()`.
Server qayta ishga tushganda barcha JWT tokenlar bekor bo'ladi, bir nechta worker bo'lsa
bir worker bergan token boshqasida ishlamaydi. **Yechim:** `SECRET_KEY = config('SECRET_KEY')`.

### 2. `ALLOWED_HOSTS` o'rnatilmagan
`core/settings.py:29` — `config('ALLOWED_HOSTS', ...)` natijasi hech qayerga yozilmagan.
`DEBUG=False` da barcha so'rovlar 400 qaytaradi. **Yechim:** `ALLOWED_HOSTS = config(...)`
(tenant subdomenlari uchun `.example.uz` ko'rinishida).

### 3. Homework: istalgan foydalanuvchi uy vazifasini yarata / o'zgartira / o'chira oladi
`apps/homework/views.py` — `HomeworkViewsets` va `HomeworkResourceViewSet` da faqat
`IsAuthenticated` bor, `get_queryset` filtri yo'q. Natija:
- talaba **barcha guruhlarning** uy vazifalarini ko'radi;
- talaba `POST/PATCH/DELETE /Homework/` qila oladi.
**Yechim:** o'qituvchi faqat o'z guruhi darslariga, talaba faqat o'z guruhi vazifalarini (faqat o'qish).

### 4. Imtihon: bitta savolni takror yuborib ball oshirish mumkin
`apps/exam/views.py` `submit_exam` — `answers` ichida bir xil `question_id` takrorlansa,
`total_score` har safar qo'shiladi. **Yechim:** savollarni `set` bilan unikal qilish yoki ballni
`ExamStudentAnswerModels` dan qayta hisoblash.

### ~~5. Imtihon: `answers` va `submission_file` ni birga yuborib bo'lmaydi~~ — frontendda hal qilindi
DRF multipart ichidagi `answers[0]question_id`, `answers[0]answer_id` ko'rinishidagi kalitlarni
nested ro'yxat sifatida o'qiydi (`html.parse_html_list`). Lokal backendda tekshirildi (2026-10-07):
javoblar ham, fayl ham saqlanadi, bo'sh `answer_id` → `null`. Backend o'zgarishi shart emas.
Frontend: `src/features/student/exams/api.ts` → `submitExam()`.

## 🟠 Muhim (ba'zi sahifalarni qurib bo'lmaydi)

### 6. ADMIN kurslarni ko'ra olmaydi
`CourseViewSet.permission_classes = [IsSuperAdmin]`. Markaz ADMINi guruh yaratayotganda
kurslar ro'yxatini ola olmaydi (select bo'sh qoladi). **Taklif:** ADMIN uchun kamida `list/retrieve`.

### 7. Talaba o'z guruhlari, darslari va dars jadvalini ko'ra olmaydi
`LessonViewSet` — faqat `IsTeacher`, `ScheduleViewSet` — faqat Admin,
`GroupViewSet` — faqat Admin. Talaba uchun "Mening guruhlarim / darslarim / jadvalim" endpointi yo'q.
**Taklif:** `GET /Educations/student/groups/`, `.../lessons/`, `.../schedules/` (faqat o'qish).

### 8. ADMIN darslarni ko'ra olmaydi
`LessonViewSet` faqat o'qituvchi uchun. Admin guruh sahifasida darslar ro'yxatini ko'rsata olmaydi.

### 9. Pagination yo'q
`REST_FRAMEWORK` da `DEFAULT_PAGINATION_CLASS` yo'q — ro'yxatlar to'liq qaytadi.
**Taklif:** `PageNumberPagination`, `PAGE_SIZE=20`, `page_size` query param bilan.
Frontend jadvallari `{count, next, previous, results}` formatini kutadi.

### 10. Kurs narxi 999.99 dan oshmaydi
`Course.price = DecimalField(max_digits=5, decimal_places=2)`. So'mdagi narxlar (500 000)
saqlanmaydi. **Taklif:** `max_digits=12, decimal_places=2`.

### 11. `schema.yml` dagi login javobi noto'g'ri
`/User/login/` javobi schema'da `{username, password}` deb ko'rsatilgan, aslida
`{access, refresh, id, role, schema_name, ...}` qaytadi. `@extend_schema(responses=...)` kerak.
*Frontendda hozircha:* tip qo'lda yozilgan (`src/features/auth/types.ts`).

### 12. Parol o'zgartirishda eski parol ixtiyoriy
`ChangePasswordSerializer.old_password` — `required=False`. Token o'g'irlangan bo'lsa,
parolni eski parolsiz almashtirish mumkin. **Taklif:** majburiy qilish.
*Frontendda:* maydon majburiy qilib qo'yilgan.

### 18. Davomat (`bulk-mark`) yarim saqlanib qolishi mumkin
`POST /Attendance/bulk-mark/` tranzaksiya ichida emas, Telegram xabar vazifasi esa har bir talaba
uchun sikl ichida `.delay()` qilinadi. Redis/Celery xatosida 500 qaytadi, lekin oldingi talabalar
davomati saqlangan bo'ladi (lokal sinovda 5 tadan 3 tasi saqlandi). **Yechim:** `transaction.atomic()`
va xabarlarni `transaction.on_commit` orqali yuborish; broker xatosi so'rovni yiqitmasligi kerak.

### 19. Guruh boshlanish sanasi o'tgan kun bo'lishi mumkin emas
`POST /Educations/groups/` — "Boshlanish sanasi o'tgan vaqtda bo'lmaydi". Allaqachon boshlangan
guruhlarni tizimga kiritib bo'lmaydi (tizimga o'tishda muammo). Bu atayin qilinganmi — aniqlashtirish kerak.
*Frontendda:* datepicker'da o'tgan kunlar o'chirib qo'yiladi.

## 🟡 Kichik

13. `passing_score` ball sifatida (standart 60), savollar yig'indisi 10 bo'lsa imtihondan o'tib bo'lmaydi.
    Foiz sifatida hisoblash yoki `total_points` dan oshmasligini validatsiya qilish kerak.
14. `ExamAttemptModels` da `(exam, student)` unique constraint yo'q — parallel `start` ikki urinish yaratadi.
15. Imtihonlar ro'yxatida N+1 (`get_my_attempt`, `get_questions` har bir imtihonga alohida so'rov).
16. `schema.yml` da ko'p endpointlar uchun birinchi content-type `multipart/form-data` —
    generatsiya qilingan client JSON o'rniga FormData yuboradi. Ishlaydi, lekin `null` qiymatlarni
    yuborib bo'lmaydi (masalan, maydonni bo'shatish).
17. Ota-ona Telegram botga ulanayotganda faqat birinchi topilgan markazga bog'lanadi.
20. `redis` 8.x kutubxonasi RESP3 (`HELLO 3`) ishlatadi — Redis server kamida 6-versiya bo'lishi kerak
21. Imtihon natijasida talaba noto'g'ri javob bergan savolning **to'g'ri javobini ko'ra olmaydi** —
    `ExamStudentAnswerDetailSerializer` faqat tanlangan variantni beradi, `StudentExamQuestionSerializer`
    esa `is_correct` ni yashiradi (yakunlangandan keyin ham). Dizayndagi "to'g'ri javob" qatori uchun
    yakunlangan urinishda `correct_answer_id` / `correct_answer_text` qaytarish kerak.
22. Imtihon savollari va variantlari teskari tartibda keladi (`AbsTractModel.Meta.ordering` — yangisi
    birinchi). Frontend `id` bo'yicha saralaydi; backendda `ordering = ['pk']` qo'yilsa yaxshi.
23. `start` javobida savollar yo'q — frontend keyin `GET /Exams/{id}/` ni alohida so'raydi.
    `ExamAttemptDetailSerializer` ga savollarni qo'shish bitta so'rovni tejaydi (majburiy emas).
24. Uy vazifasi topshirish (`POST /Homework/submissions/`) **deadline'ni tekshirmaydi** — muddati o'tgan
    vazifaga ham javob qabul qilinadi. Frontend formani yopadi, lekin API orqali topshirish mumkin.
25. Bitta vazifani **bir necha marta** topshirish mumkin (`(homework, student)` unique emas) —
    `my_submission` esa faqat birinchisini qaytaradi. Frontend topshirilgandan keyin formani ko'rsatmaydi.
26. Talaba o'z topshirig'ini **baholangandan keyin ham** `PATCH /Homework/submissions/{id}/` bilan
    o'zgartira oladi (javob/fayl) — baho eski javobga qo'yilgan bo'lib qoladi.
27. `HomeworkSubmission.file` da validator yo'q (resurslardagi 5 MB / PDF·DOC·DOCX cheklovi
    topshiriqqa qo'llanmagan). Frontend xuddi shu cheklovni qo'yadi. Fayl uuid nom bilan saqlanadi —
    asl nomi yo'qoladi (o'qituvchi uchun noqulay).
28. `GET /Homework/` filtrlanmaydi — **o'qituvchi ham** markazdagi barcha vazifalarni ko'radi (talaba kabi, #3/#7).
    Frontend o'qituvchining o'z darslari (`/Educations/lessons/`) bo'yicha filtrlaydi. `?lesson=` / `?group=` filtri ham yo'q.
29. Imtihon savoli uchun "kamida 2 variant, aniq bitta to'g'ri javob" backendda tekshirilmaydi
    (`ExamAnswerQuestionModels` alohida CRUD). Frontend saqlashdan oldin tekshiradi, lekin API orqali buzish mumkin.
30. Savol yoki variant o'zgartirilsa topshirilgan urinishlarning bali qayta hisoblanmaydi — frontend ogohlantiradi.
31. `/Exams/questions/?exam=`, `/Exams/attempts/?exam=`, `/Homework/submissions/?homework=` query parametrlari
    schema.yml da yo'q (orval hooklarida ham yo'q) — `@extend_schema(parameters=[...])` qo'shilsa yaxshi.
    (README'da yozib qo'yish kerak; Windows uchun eski Redis 5 porti ishlamaydi).
32. **Production'da yuklangan fayllar ochilmaydi:** `MEDIA_URL` faqat `DEBUG=True` da ulanadi (`core/urls.py`).
    Production'da nginx `/media/` ni diskdan berishi kerak (deploy/nginx.conf da shunday qilingan) — serverda
    `MEDIA_ROOT` yo'li nginx'ga ma'lum bo'lishi kerak. HTTPS ortida fayl havolalari `http://` bo'lib qolmasligi
    uchun `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` kerak.
33. `GET /Attendance/my-attendance/` dagi `attendance_rate` faqat `present` ni sanaydi — kechikkan talaba
    "kelmagan" bo'lib chiqadi, sababli dars ham foizni tushiradi. Frontend o'zi hisoblaydi:
    (kelgan + kechikkan) / (jami − sababli). Qaysi biri to'g'ri ekanini kelishib olish kerak.
    Yozuvlarda **dars sanasi yo'q** (`lesson_date`) — frontend `marked_at` ni ko'rsatadi.
34. ADMIN imtihon natijalarini (`/Exams/{id}/attempts/`, `IsExamGroupTeacher`) ko'ra olmaydi —
    admin panelda imtihonlar faqat ro'yxat sifatida.
35. `/User/` va `/Parents/` da qidiruv va filtr yo'q (`?role=`, `?search=`, `?user=`) — frontend butun
    ro'yxatni olib filtrlaydi; foydalanuvchi ko'paysa sekinlashadi (#9 bilan birga hal qilish kerak).
    `/Parents/` javobida botga ulanganlik holati yo'q — har bir qator uchun `parent-status` alohida so'raladi.
36. Davomat `bulk-mark` har saqlashda kelmagan/kechikkanlar ota-onasiga **qayta** xabar yuboradi (holat
    o'zgarmagan bo'lsa ham). Frontend faqat o'zgargan qatorlarni yuboradi, lekin API darajasida himoya yo'q.
37. Markaz o'chirilganda schema saqlanib qoladi (`force_drop=False`) — bazada "yetim" schemalar
    to'planadi, o'sha nom bilan qayta yaratilganda eski ma'lumotlar bilan nima bo'lishi tekshirilmagan.
    Tozalash yo'li (yoki `force_drop` opsiyasi) kerak.
