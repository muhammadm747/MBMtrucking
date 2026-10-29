# MBM Trucking

Truck'lar uchun yuk, rasxod va haftalik/oylik foyda hisoboti.
**Backend:** Django 5.2 + Django REST Framework · **Frontend:** React 18 + Vite · **Baza:** SQLite (PostgreSQL'ga o'tkazsa bo'ladi)

```
MBMtrucking/
├── backend/            Django loyihasi
│   ├── config/         sozlamalar, URL'lar (React build'ni ham shu beradi)
│   ├── accounts/       login / logout / me (session + CSRF)
│   └── fleet/          Truck, Load, Expense modellari, REST API, zaxira import/eksport
├── frontend/           React ilova
│   └── src/
│       ├── api/        Django API bilan ishlash
│       ├── lib/        hisob-kitob dvigateli (engine.js), sana, format
│       ├── state/      Auth, Data, Toast, Prefs kontekstlari
│       ├── components/ umumiy komponentlar, yuk formasi, grafik
│       └── pages/      Bosh, Yuklar, Rasxod, Hisobot, Sozlama, Login
└── data/               eski artifactdan olingan zaxira (103 yuk, 4 rasxod, 7 truck)
```

## Birinchi marta ishga tushirish (Windows)

Kerak: Python 3.12+ va Node.js 20+.

```powershell
# 1. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py import_backup ..\data\backup-2026-10-27.json
.\.venv\Scripts\python.exe manage.py createsuperuser

# 2. Frontend
cd ..\frontend
npm install
```

`import_backup` faqat yo'q yozuvlarni qo'shadi — qayta ishlatsa ham hech narsa ikkilanmaydi yoki o'chmaydi.

## Har kuni ishlatish (development)

Ikki terminal oching:

```powershell
cd backend;  .\.venv\Scripts\python.exe manage.py runserver
```
```powershell
cd frontend; npm run dev
```

So'ng brauzerda **http://localhost:5173** ni oching va `createsuperuser` bilan yaratgan login/parol bilan kiring.
Admin panel: http://localhost:8000/admin/

## Testlar

```powershell
cd backend;  .\.venv\Scripts\python.exe manage.py test   # 55 ta test: API, akkauntlar, parol tiklash, validatsiya, zaxira
cd frontend; npm test                                     # 12 ta test: foyda/rent/driver hisob-kitobi
```

## Production (bitta server)

```powershell
cd frontend; npm run build          # frontend/dist hosil bo'ladi
cd ..\backend
.\.venv\Scripts\python.exe manage.py collectstatic --noinput
```

Keyin Django'ni WSGI server (masalan gunicorn/waitress) orqali HTTPS ortida ishga tushiring.
Muhit o'zgaruvchilari `backend/.env.example` da. Django `frontend/dist` dagi React ilovani o'zi beradi,
shuning uchun alohida frontend server kerak emas.

## Akkauntlar

- Har kim saytda **ro'yxatdan o'tib** o'z akkauntini ochishi mumkin. Har bir akkaunt alohida kompaniya:
  o'z truck'lari, yuklari va rasxodlari bor, boshqa akkauntlarning ma'lumotini ko'rmaydi.
- Yangi akkaunt bo'sh boshlanadi. Zaxira fayl import qilinsa, ma'lumot faqat shu akkauntga qo'shiladi.
- Ro'yxatdan o'tishni yopish: `DJANGO_ALLOW_SIGNUP=false`. Shunda akkauntlarni faqat admin `/admin/` da ochadi.
- Navbardagi akkaunt tugmasi (ism bosh harfi): akkaunt sozlamalari (email, parolni o'zgartirish),
  boshqa akkauntga kirish va chiqish.
- **Parolni unutganda:** kirish sahifasida "Parolni unutdingizmi?" → login yoki email → emailga 6 xonali kod
  (15 daqiqa amal qiladi, 5 marta noto'g'ri kiritilsa bekor bo'ladi) → yangi parol. Faqat email kiritilgan
  akkauntlar tiklanadi.
- Email yuborish: `BREVO_API_KEY` (tavsiya, Render bepul tarifida SMTP portlari yopiq) yoki `EMAIL_HOST` va boshqa
  SMTP sozlamalari. Ikkalasi ham bo'lmasa, xat server log'iga chiqadi. Yuboruvchi: `DJANGO_DEFAULT_FROM_EMAIL`.
- Admin akkaunti (`DJANGO_SUPERUSER_USERNAME` / `_PASSWORD`) har deployda `ensure_superuser` buyrug'i bilan
  yaratiladi yoki paroli shu qiymatga moslanadi. Artifact'dagi asl ma'lumotlar shu akkauntga tegishli.

## API

Ro'yxatdan o'tish va kirishdan boshqa hammasi login talab qiladi (session cookie + `X-CSRFToken`)
va faqat kirgan akkauntning ma'lumotlari bilan ishlaydi.

| Yo'l | Vazifa |
|---|---|
| `GET /api/auth/me/` · `POST /api/auth/login/` · `POST /api/auth/logout/` | Kirish |
| `POST /api/auth/register/` | Ro'yxatdan o'tish (login, email ixtiyoriy, parol) |
| `PATCH /api/auth/me/` · `POST /api/auth/password/change/` | Emailni va parolni o'zgartirish |
| `POST /api/auth/password/forgot/` · `POST /api/auth/password/reset/` | Emailga kod yuborish va u bilan yangi parol qo'yish |
| `/api/trucks/` | Truck'lar (nom, rent, to'lov kuni, driver maoshi, dispatch %) |
| `/api/loads/` | Yuklar (pickup/delivery sana, vaqt turi, manzil, mile, pul) |
| `/api/expenses/` | Rasxodlar (yoqilg'i, ta'mir, insurance, …) |
| `GET /api/backup/export/` | Akkauntning hamma ma'lumotini JSON fayl qilib yuklab olish |
| `POST /api/backup/import/` | JSON fayldan tiklash (faqat qo'shadi) |

Zaxira fayl formati eski Claude artifact bilan bir xil — u yerdan olingan fayllarni bu yerga tiklash mumkin va aksincha.

## Hisob-kitob qoidalari

- Yuk davrga **pickup sanasi** bo'yicha, rasxod o'z sanasi bo'yicha kiradi. Hafta: dushanba–yakshanba, New York vaqti.
- **Rent:** oylik hisobotda bir marta to'liq; haftalikda to'lov kuni tushgan haftada to'liq, kun yozilmagan bo'lsa har hafta 12/52.
- **Driver maoshi** (har mile $ yoki yuk pulidan %) va **dispatch %** truck sozlamasidan avtomatik hisoblanadi.
