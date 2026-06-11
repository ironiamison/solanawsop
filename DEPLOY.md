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

## Not supported without changes

- **Vercel / Netlify static** — custom `server.ts` + Socket.io need a long-running Node process
- **Namecheap shared PHP hosting** — no Node runtime

## Optional: Postgres

For multi-instance hosting, switch Prisma `datasource` to `postgresql` and set `DATABASE_URL` to a managed Postgres (Neon, Supabase, Railway).
