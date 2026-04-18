# ISO 9001 Compliance App (Supabase Auth)

## Environment setup

Create `.env.local` from `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Minimal profile table

Store app-level role/profile metadata separately from Supabase Auth users:

```sql
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','staff','viewer')),
  created_at timestamptz not null default now()
);
```

This app safely handles signed-in users who do not have a `profiles` row yet by defaulting to `viewer` permissions.
# ISO 9001 Compliance App (Next.js + TypeScript)

Starter project for a professional internal compliance and quality management application.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui foundation (`components.json`, `cn` helper, UI primitives)
- Prisma ORM
- Supabase JavaScript client

## Project Structure

```text
app/
components/
  layout/
  ui/
lib/
prisma/
types/
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment variables:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

4. Open the app:

- http://localhost:3000

## Database (Prisma)

Generate Prisma client:

```bash
npm run prisma:generate
```

Run a local migration:

```bash
npm run prisma:migrate -- --name init
```

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## Notes

- Navigation placeholders are included for Dashboard, Clauses, Actions, Notifications, and Admin.
- The app shell includes a sidebar, top header, and content area suitable for internal business tooling.
