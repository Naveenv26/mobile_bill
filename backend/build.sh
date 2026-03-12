#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "--- Installing Dependencies ---"
pip install -r requirements.txt

echo "--- Running Collectstatic ---"
python manage.py collectstatic --no-input

echo "--- Applying Migrations to Neon DB ---"
python manage.py migrate --no-input || echo "⚠️ Warning: Migrations failed. Please check your DATABASE_URL."

echo "--- Seeding Subscription Plans ---"
python manage.py seed_plans || echo "⚠️ Warning: Seed failed. Plans may already exist or DB is unreachable."

echo "--- Build Complete ---"