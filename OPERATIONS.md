# Operations checklist

Everything needed to go from local demo → production with real `$SWSOP` cash games.

## 1. Vercel (website)

**Symptom:** `402 Payment Required` / `DEPLOYMENT_DISABLED` on solanawsop.com

1. Open [Vercel billing](https://vercel.com/teams/ironiamisons-projects/settings/billing)
2. Clear overdue balance or upgrade plan
3. Redeploy `main` from the Vercel dashboard or push a commit

**Required env vars (Production):**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://solanawsop.com` |
| `NEXT_PUBLIC_SWSOP_MINT` | pump.fun SPL mint |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` or `devnet` |
| `NEXT_PUBLIC_MAINNET_RPC_URL` | Helius RPC |
| `DATABASE_URL` | Postgres connection string |
| `UPSTASH_REDIS_REST_URL` | Demo table state |
| `UPSTASH_REDIS_REST_TOKEN` | Demo table state |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Auth |
| `PRIVY_APP_SECRET` | Auth |

See `app/.env.production.example`.

## 2. Token (`$SWSOP`)

1. Launch on [pump.fun](https://pump.fun)
2. Set `NEXT_PUBLIC_SWSOP_MINT=<mint>` in Vercel
3. Redeploy

Full escrow flow: [SWSOP_LAUNCH.md](./SWSOP_LAUNCH.md)

## 3. On-chain tables (one-time)

1. Deploy program: `./scripts/deploy-program.sh devnet` (or mainnet)
2. Connect authority wallet on lobby
3. Click **Initialize tables** (`configure_mint` + 5 tier rooms)

## 4. Fly.io socket (optional)

Realtime chat/voice when frontend and socket are on different hosts.

```bash
# Set NEXT_PUBLIC_SOCKET_URL to your Fly app URL
fly deploy  # requires Fly billing current
```

Demo works without Fly via HTTP polling + Redis.

## 5. Postgres

See [DATABASE.md](./DATABASE.md) — required for profiles, friends, tournament registrations in production.

## 6. Smoke tests after deploy

```bash
cd app
npm test                    # engine unit tests
npm run test:demo-smoke     # HTTP demo (server on :3001)
npm run smoke               # basic health checks
```

## 7. Tournament registration

- `/tournaments` — Grand Opening **Register free** (stores wallet in Postgres)
- Bracket play at start time is a follow-up (registration is live)
