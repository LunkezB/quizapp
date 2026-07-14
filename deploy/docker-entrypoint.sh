#!/bin/sh
# Runs once per container start, before the app process becomes PID 1.
# Uses `prisma migrate deploy` (never `migrate dev`): it only applies
# already-committed migrations and never prompts or generates new ones,
# which is the only safe mode for an unattended production container.
set -e

echo "[entrypoint] Applying database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint] Starting application: $*"
exec "$@"
