#!/bin/sh
set -e
cd /app
npx prisma db push --skip-generate 2>/dev/null || npx prisma db push
exec npx tsx server.ts
