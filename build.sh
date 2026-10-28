#!/usr/bin/env bash
# Render build: install backend deps, build the React app, prepare the database.
set -o errexit

pip install -r backend/requirements.txt

cd frontend
npm ci
npm run build
cd ..

cd backend
python manage.py collectstatic --noinput
python manage.py migrate --noinput

# First admin account from DJANGO_SUPERUSER_USERNAME / _EMAIL / _PASSWORD (skipped if it already exists).
if [ -n "${DJANGO_SUPERUSER_USERNAME:-}" ]; then
  python manage.py createsuperuser --noinput || echo "Superuser already exists, skipping."
fi

# Original data from the artifact; only adds missing records, safe to run on every deploy.
python manage.py import_backup ../data/backup-2026-10-27.json
