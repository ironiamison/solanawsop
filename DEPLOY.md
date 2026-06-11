# Deploy to solanawsop.com

The domain is registered on Namecheap. Right now **solanawsop.com** points to a parking page — you need a host that runs Node.js (this app uses a custom server + Socket.io, so plain static hosting won't work).

## Recommended: VPS + Docker

Works on any $5–10/mo VPS (DigitalOcean, Hetzner, Linode, Namecheap VPS, etc.).

### 1. Server setup

```bash
# On the VPS
git clone <your-repo> solana_poker && cd solana_poker
cp app/.env.production.example app/.env.production
# Edit app/.env.production — Privy keys, DATABASE_URL, etc.
docker compose up -d --build
```

App listens on port **3000**.

### 2. Namecheap DNS

In Namecheap → Domain → Advanced DNS:

| Type | Host | Value |
|------|------|-------|
| **A** | `@` | Your VPS public IP |
| **A** or **CNAME** | `www` | `@` or VPS IP |

Remove URL forwarding / parking records.

### 3. HTTPS (nginx + Let's Encrypt)

```nginx
server {
  listen 80;
  server_name solanawsop.com www.solanawsop.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Then: `certbot --nginx -d solanawsop.com -d www.solanawsop.com`

### 4. Privy (required for login)

In [Privy dashboard](https://dashboard.privy.io):

- **Allowed origins:** `https://solanawsop.com`, `https://www.solanawsop.com`
- Copy `NEXT_PUBLIC_PRIVY_APP_ID` + `PRIVY_APP_SECRET` into `.env.production`

Rebuild after changing public env vars:

```bash
docker compose up -d --build
```

### 5. Production env checklist

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://solanawsop.com` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | From Privy |
| `PRIVY_APP_SECRET` | From Privy |
| `DATABASE_URL` | `file:./prisma/prod.db` (Docker volume) or Postgres URL |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` until mainnet ready |

### 6. Verify

```bash
curl -I https://solanawsop.com
cd app && npm run smoke https://solanawsop.com
```

## Vercel frontend + socket server (current production)

The site UI can stay on **Vercel**. Real-time poker needs a small Node service running `socket-server.ts`.

### 1. Deploy the socket service (Railway — easiest)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub → repo `ironiamison/solanawsop`
2. Set **Root directory** to `solana_poker/app` (or `app` if monorepo root is `solana_poker`)
3. Railway picks up `railway.toml` + `Dockerfile.socket` automatically
4. Add env var: `ALLOWED_ORIGINS=https://solanawsop.com,https://www.solanawsop.com`
5. Copy the public URL (e.g. `https://solanawsop-socket-production.up.railway.app`)

**Render:** use `app/render.yaml` instead (same env vars).

**Local test:** `cd app && npm run socket` → health at http://localhost:3000/health

### 2. Point Vercel at the socket server

In Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SOCKET_URL` | Your Railway/Render URL (no trailing slash) |

Redeploy Vercel after saving. The demo table, chat, and voice all use this host.

### 3. Verify

```bash
curl https://YOUR-SOCKET-URL/health
curl https://YOUR-SOCKET-URL/api/demo/lobby
```

Open https://solanawsop.com/demo — badge should show **Live** and sockets connect.

## Not supported without changes

- **Vercel alone** — no long-running Socket.io on serverless
- **Namecheap shared PHP hosting** — no Node runtime

## Optional: Postgres

For multi-instance hosting, switch Prisma `datasource` to `postgresql` and set `DATABASE_URL` to a managed Postgres (Neon, Supabase, Railway).
