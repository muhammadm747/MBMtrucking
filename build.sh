#!/usr/bin/env bash
# Render build: install backend deps, build the React app, prepare the database.
set -o errexit

# On Render the database must be PostgreSQL: a SQLite file there is wiped on every deploy.
if [ -n "${RENDER:-}" ] && [ -z "${DATABASE_URL:-}" ]; then
  echo "=================================================================="
  echo " XATO: DATABASE_URL topilmadi."
  echo " Render'da PostgreSQL yarating, uning 'Internal Database URL' ini"
  echo " web servis -> Environment bo'limiga DATABASE_URL nomi bilan qo'shing."
  echo " DJANGO_DB_PATH yozilgan bo'lsa, uni o'chiring."
  echo "=================================================================="
  exit 1
fi

# The URL must be complete: postgresql://user:password@host/dbname (no spaces, no quotes).
if [ -n "${RENDER:-}" ] && ! [[ "$DATABASE_URL" =~ ^postgres(ql)?://[^[:space:]/]+@[^[:space:]/]+/[^[:space:]/?]+ ]]; then
  echo "=================================================================="
  echo " XATO: DATABASE_URL noto'g'ri yoki to'liq emas."
  echo " Hozir yozilgani (parol yashirilgan):"
  echo "   $(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:/@]*):[^@]*@#\1:****@#')"
  echo " To'g'risi shunday bo'lishi kerak:"
  echo "   postgresql://USER:PAROL@dpg-xxxxxxxx-a/BAZA_NOMI"
  echo " Render bazasi sahifasidan 'Internal Database URL' ni TO'LIQ nusxalang"
  echo " (qo'shtirnoq va bo'sh joysiz)."
  echo "=================================================================="
  exit 1
fi

pip install -r backend/requirements.txt

cd frontend
npm ci
npm run build
cd ..

# Keep a copy of the built app inside backend/ (see FRONTEND_DIST in settings.py).
test -f frontend/dist/index.html || { echo "XATO: frontend/dist/index.html yaratilmadi"; exit 1; }
rm -rf backend/spa
cp -r frontend/dist backend/spa
echo "Frontend copied to backend/spa:" $(ls backend/spa)

cd backend
python manage.py collectstatic --noinput
python manage.py migrate --noinput

# Admin account from DJANGO_SUPERUSER_USERNAME / _EMAIL / _PASSWORD, created on the first deploy.
# Later deploys keep its password; set DJANGO_SUPERUSER_RESET_PASSWORD=true for one deploy to force it.
python manage.py ensure_superuser

# Original data from the artifact; only adds missing records, safe to run on every deploy.
python manage.py import_backup ../data/backup-2026-10-27.json
