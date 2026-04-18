# ISO 9001 Compliance App (Next.js + Supabase + Prisma)

Internal ISO 9001 compliance application built with Next.js App Router, Supabase Auth, and Prisma on Postgres.

## Environment Variables

Create `.env.local` from `.env.example`.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key.
- `DATABASE_URL` - **Pooled** Postgres connection string (runtime queries, serverless-safe).
- `DIRECT_URL` - **Direct** Postgres connection string (migrations).

> For Supabase + Prisma on Vercel, keep `DATABASE_URL` on the pooler host/port and `DIRECT_URL` on the direct `db.<project-ref>.supabase.co:5432` host.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

App URL: <http://localhost:3000>

## Prisma Commands

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Deploying to Vercel with Supabase

### 1) Create Supabase project + database

- Create a Supabase project.
- Copy the project URL and anon key.
- Copy both database connection strings:
  - pooled connection (for `DATABASE_URL`)
  - direct connection (for `DIRECT_URL`)

### 2) Configure Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add for Production (and Preview if needed):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

### 3) Build & migrate settings

This repo uses:

- `postinstall: prisma generate` (ensures Prisma Client exists in Vercel build)
- `npm run prisma:migrate:deploy` for production-safe migrations

Set Vercel build command to:

```bash
npm run prisma:migrate:deploy && npm run build
```

### 4) Deploy

- Push to your connected Git provider.
- Trigger Vercel deployment.
- Confirm health endpoint:
  - `GET /healthz` returns `{ "ok": true }`.

## Auth & Routing Behavior

- Public routes:
  - `/`
  - `/login`
  - `/unauthorized`
  - `/healthz`
- All other app routes are protected by middleware and redirect unauthenticated users to `/login?next=<path>`.
- `/` performs a safe auth-based redirect:
  - authenticated → `/clauses`
  - unauthenticated → `/login`

## Production Notes

- Missing Supabase env in production now returns a clear HTTP 500 JSON error from middleware instead of opaque failures.
- `DIRECT_URL` is required by Prisma schema for migrations.
- Keep the pooled URL in `DATABASE_URL` to avoid serverless connection exhaustion.
