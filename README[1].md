# Kaira Africa

A premium business management platform for African businesses — customers, transactions, team management, analytics, and reporting, built for the Gambian market.

## Architecture

```
Frontend (React/Vite)
        ↓  HTTPS (VITE_API_BASE_URL)
API Server (Express 5 + Drizzle ORM)
        ↓
Supabase PostgreSQL  ←  the database itself, not the client SDK
        ↓
Redis (rate limiting)
        ↓
Email (SMTP) / SMS (Africa's Talking, Twilio, or a mock provider in dev)
```

Supabase is used as **PostgreSQL infrastructure only**. The backend connects directly via `DATABASE_URL` (a standard Postgres connection string) using Drizzle ORM — it does not use the Supabase client SDK, Supabase Auth, or Supabase's REST API. Authentication, sessions, and authorization are implemented entirely in this codebase (see [Authentication](#authentication) below).

## Repository structure

```
artifacts/
  api-server/       Express backend — routes, repositories, middleware, services
  kaira-africa/      React/Vite frontend
lib/
  db/                Drizzle schema + migrations (source of truth for the database)
  api-spec/          OpenAPI specification
  api-zod/           Generated Zod validation schemas (from the OpenAPI spec)
  api-client-react/  Generated React Query hooks (from the OpenAPI spec)
.github/workflows/   CI
```

The OpenAPI spec in `lib/api-spec` is the single source of truth for the API contract. Backend routes validate against the generated Zod schemas (`lib/api-zod`); the frontend consumes the generated React Query hooks (`lib/api-client-react`). Changing the API means editing `lib/api-spec/openapi.yaml` and regenerating both (`pnpm --filter @workspace/api-spec run generate`, or see that package's `orval.config.ts`) — never hand-editing the generated files.

## Local development

### Prerequisites

- Node.js 22 (see `package.json`'s `packageManager` field — this repo uses `pnpm@11.18.0` via Corepack)
- PostgreSQL 16+ (a local instance, or point `DATABASE_URL` at anything reachable — including a Supabase project)
- Redis (optional in development — the rate limiter falls back to an in-process store if `REDIS_URL` is unset; required in production)

### Setup

```bash
corepack enable
pnpm install

# Copy and fill in environment files
cp artifacts/api-server/.env.development.example artifacts/api-server/.env
cp artifacts/kaira-africa/.env.example artifacts/kaira-africa/.env
```

### Database migrations

```bash
# Apply migrations (uses drizzle-orm's programmatic migrator, not the CLI)
cd artifacts/api-server
DATABASE_URL=... node dist/scripts/migrate.mjs   # after building, or:
DATABASE_URL=... npx tsx scripts/migrate.ts       # directly from source

# Generate a new migration after changing lib/db/src/schema/*.ts
pnpm --filter @workspace/db run generate
```

### Backend

```bash
cd artifacts/api-server
pnpm run dev     # builds once and starts (see package.json)
# or for hot reload:
npx tsx watch src/index.ts
```

### Frontend

```bash
cd artifacts/kaira-africa
pnpm run dev
```

### Docker Compose (full stack: Postgres + Redis + API)

```bash
docker compose up
```

## Authentication

Two entirely separate auth surfaces, deliberately never sharing tables or session tokens:

**Business users** — Gambian phone number + OTP (`POST /auth/request-otp`, `POST /auth/verify-otp`). New users complete a Full Name step, then business onboarding (`POST /businesses`), before reaching the dashboard.

**Admins** — email + password (`POST /auth/login`), Argon2id-hashed, with account lockout after repeated failures and a separate password-reset flow (`POST /auth/request-password-reset`, `POST /auth/reset-password`). Admin accounts have no self-service signup — the first admin is created via `scripts/seed-admin.ts`, reading `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`.

Both issue opaque, prefixed bearer tokens (`usr_…` / `adm_…`) backed by revocable DB session rows — not JWTs — so a session can be individually or entirely (`POST /auth/logout-all`) revoked server-side at any time. `POST /auth/logout` works for either token type.

**RBAC**: `owner`/`admin`/`manager`/`staff` on the backend, enforced via `requireRole` middleware — currently `owner`/`admin` can write team/business data, everyone else is read-only. The frontend mirrors this to hide controls a person can't use, but the backend middleware is the actual security boundary; hiding a button never substitutes for server-side enforcement.

## Production deployment

### Required environment variables

See `artifacts/api-server/.env.production.example` and `artifacts/kaira-africa/.env.example` for the full annotated list. Summary:

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Backend | Yes | Postgres connection (Supabase pooled connection recommended) |
| `DIRECT_URL` | Backend | If `DATABASE_URL` is pooled | Non-pooled connection for migrations |
| `NODE_ENV`, `PORT` | Backend | Yes | Runtime config |
| `API_BASE_URL`, `WEB_BASE_URL`, `FRONTEND_URL`, `BACKEND_URL` | Backend | Yes | CORS + link construction |
| `SESSION_SECRET`, `OTP_SECRET`, `PASSWORD_RESET_SECRET` | Backend | Yes | Pepper session/OTP/reset-token hashes |
| `REDIS_URL` | Backend | Yes | Distributed rate limiting |
| `SMTP_*` | Backend | Yes | Admin password-reset emails |
| `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID` | Backend | Yes for real OTP delivery | `mock` \| `africastalking` \| `twilio` |
| `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` | Backend | Yes | First admin account |
| `VITE_API_BASE_URL` | Frontend | Yes | Where the frontend finds the API |

`JWT_SECRET` is also validated but not currently used anywhere in the codebase — this app uses revocable DB-backed sessions instead of JWTs; the variable is reserved for a possible future service.

### Database (Supabase)

Supabase provides the PostgreSQL instance. Point `DATABASE_URL` (and `DIRECT_URL`, if using Supabase's pooler) at your Supabase project's connection string, then run the migration script once as a release step — **not** on every container boot:

```bash
node dist/scripts/migrate.mjs
```

### Redis

Required in production because the rate limiter needs to enforce limits consistently across multiple API server replicas — the in-process fallback (used automatically in development, or transiently if Redis becomes unreachable) only works correctly for a single instance.

### Email / SMS

Set `SMTP_*` for password-reset emails via Nodemailer. Set `SMS_PROVIDER` to `africastalking` or `twilio` (with `SMS_API_KEY`/`SMS_SENDER_ID`) for real OTP delivery — `mock` logs OTPs instead of sending them, appropriate for staging only.

### Deployment platforms

**Preferred:** Railway (`railway.json`) or Render (`render.yaml`) for the backend — both are configured for the multi-stage Docker build (`artifacts/api-server/Dockerfile`), with the migration script wired as a release/pre-deploy command rather than an on-boot step.

**Frontend:** any static host (Vercel, Netlify, etc.) works well for the Vite build — set `VITE_API_BASE_URL` to your deployed backend's URL.

**Vercel for the backend** (`vercel.json`) is included as an optional path since it was requested, but is *not* the preferred architecture — this backend uses a persistent Redis connection and in-process rate-limiting fallback that assume a long-running process, which fits Railway/Render/Docker naturally and Vercel's serverless model awkwardly. See the caveats documented in `artifacts/api-server/api/index.ts`.

## Verification

```bash
pnpm run typecheck:libs                                    # lib/db, lib/api-zod, etc.
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/kaira-africa run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run test                 # smoke tests (node:test)

# After deploying, run against the live environment:
node dist/scripts/verify-production.mjs
```

`verify-production.mjs` checks environment config, Postgres, Redis, SMTP, the configured SMS provider, `/live` `/ready` `/health`, and several safe authentication-rejection checks (missing token, bad admin credentials, invalid phone format) — it never creates real accounts, sends real SMS/email, or touches production business data.

## CI

`.github/workflows/backend.yml` installs dependencies, typechecks the shared libraries and backend, runs the smoke test suite, builds the backend, verifies migrations against a fresh Postgres service container, boots the built server and checks `/health`, then builds the production Docker image. There is currently no automated frontend test suite — the frontend is verified via typecheck + production build, both of which are part of this pipeline's scope to extend if a test suite is added later.
