# Backendni lokal ishga tushirish

Backend kodi `../english-education` da (boshqa dasturchiniki — kodiga tegilmaydi).
Bu papkada faqat uni lokal ishga tushirish uchun yordamchi fayllar bor.

## Har kuni

```powershell
# 1. Backend (Redis + Django + Celery, alohida oynalarda)
powershell -ExecutionPolicy Bypass -File dev\backend\start.ps1

# 2. Frontend
npm run dev
```

Brauzerda: **http://niners.localhost:5173** (o'quv markazi) yoki **http://localhost:5173** (platforma).

## Test loginlar

| Qayerda | Login | Parol | Rol |
|---|---|---|---|
| `localhost:5173` | `owner` | `owner12345` | Platforma egasi (public SUPER_ADMIN) |
| `niners.localhost:5173` | `admin` | `admin12345` | Markaz egasi (SUPER_ADMIN) |
| `niners.localhost:5173` | `manager1` | `test12345` | Markaz admini (ADMIN) |
| `niners.localhost:5173` | `teacher1` | `test12345` | O'qituvchi |
| `niners.localhost:5173` | `student1` … `student5` | `test12345` | O'quvchi |

Talabalar telefon bilan ham kira oladi: `+998901113001` … `+998901113005`.
`seed.py` ma'lumotlari: GE-1 guruhi (5 talaba, jadval), 3 ta dars, 1-dars davomati,
uy vazifasi, 3 savolli imtihon, 3 ta ota-ona.

## Bir martalik o'rnatish (2026-10-07 da bajarilgan)

Bu kompyuterda Docker ishlamaydi (WSL 2 yadrosi yo'q), shuning uchun hammasi lokal:

1. **Python 3.13** (Django 6.1 Python 3.12+ talab qiladi; tizimdagi 3.11 o'zgarmaydi):
   `%LOCALAPPDATA%\Programs\Python\Python313\python.exe`
2. **Backend venv:**
   ```powershell
   cd ..\english-education
   & "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" -m venv .venv
   .venv\Scripts\python.exe -m pip install -r requirements.txt
   ```
3. **Redis 8** (Windows build, github.com/redis-windows/redis-windows):
   `%LOCALAPPDATA%\Programs\Redis\`. Redis 5 ishlamaydi — backenddagi `redis` 8.x kutubxonasi RESP3 talab qiladi.
4. **PostgreSQL 16** (kompyuterda bor): `ee` / `ee` foydalanuvchi, `english_education` baza.
5. **`../english-education/.env`** (gitignore'da):
   ```
   DEBUG=True
   DB_NAME=english_education
   DB_USER=ee
   DB_PASS=ee
   DB_HOST=127.0.0.1
   DB_PORT=5432
   REDIS_URL=redis://127.0.0.1:6379/0
   TOKEN=
   ```
6. **Ma'lumotlar:**
   ```powershell
   .venv\Scripts\python.exe manage.py migrate_schemas --shared
   .venv\Scripts\python.exe manage.py owner_create --username owner --password owner12345
   ```
   So'ng `niners` tenanti platforma API orqali yaratildi (`POST /PublicTenants/clients/`,
   domen `niners.localhost`, admin `admin`) va `python dev/backend/seed.py` ishga tushirildi.

## Bilish kerak bo'lgan narsalar

- **Backend kodi o'zgarsa** (`runserver` qayta yuklansa) hamma login'dan chiqib ketadi —
  `SECRET_KEY` har safar yangidan yaratiladi (BACKEND_ISSUES #1). Bu frontend xatosi emas.
- **Backend yangilansa:** `git pull` → `migrate_schemas` (barcha tenantlar uchun) →
  backenddan yangi `schema.yml` → `npm run api:generate`.
- **`TOKEN` bo'sh** — Telegram xabarlari yuborilmaydi (vazifalar "chat_id mavjud emas" yoki
  "TOKEN mavjud emas" bilan tugaydi), bu normal.
- Windows `*.localhost` nomlarini o'zi hal qilmaydi (brauzer qiladi). Skript yoki curl'da
  `127.0.0.1` ga ulanib, `Host: niners.localhost:5173` header beriladi (`seed.py` ga qarang).
- Yangi markaz qo'shish: platformaga `owner` bilan kirib (keyinchalik UI orqali) yoki API bilan,
  domeni `<nom>.localhost`.

## Docker varianti (sinalmagan)

`docker-compose.yml`, `Dockerfile`, `backend.env` — WSL 2 yangilangach (`wsl --update`, admin)
Docker orqali ishga tushirish uchun tayyorlangan, lekin bu kompyuterda hali sinab ko'rilmagan.
