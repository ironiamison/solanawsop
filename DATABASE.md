# Database (SQLite dev · Postgres production)

## Local development (SQLite)

```bash
cd app
DATABASE_URL="file:./prisma/dev.db" npx prisma db push
```

Default in `.env.local`:

```bash
DATABASE_URL="file:./prisma/dev.db"
```

## Production (PostgreSQL)

Use **Vercel Postgres**, **Neon**, or **Supabase** — profiles, friends, DMs, rewards, and tournament registrations must persist across deploys.

### 1. Create a Postgres database

Copy the connection string (pooler URL for serverless).

### 2. Set `DATABASE_URL` on Vercel

```bash
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

### 3. Push schema (production)

```bash
cd app
DATABASE_URL="postgresql://..." npm run db:push:postgres
```

The production schema lives in `prisma/schema.postgres.prisma` (same models, `postgresql` provider).

### 4. Regenerate client for Postgres builds (optional)

If your CI uses Postgres only:

```bash
npx prisma generate --schema=prisma/schema.postgres.prisma
```

For hybrid local SQLite + prod Postgres, keep `schema.prisma` as SQLite for dev and run `db:push:postgres` in CI against production `DATABASE_URL`.

## Redis (demo tables)

Demo game state uses Upstash Redis when configured:

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Without Redis, demo rooms use in-memory state (fine for single-node dev, not for Vercel serverless).

## Models added for tournaments

- `Tournament` — event metadata, start time, capacity
- `TournamentRegistration` — wallet / Privy user entries

Grand Opening is auto-seeded on first `GET /api/tournaments`.
