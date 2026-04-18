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
