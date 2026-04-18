# Prisma + Supabase Postgres setup

## Environment variables

Set these before running Prisma commands:

- `DATABASE_URL`: pooled connection string (Supabase transaction/pooler URL)
- `DIRECT_URL`: direct connection string (Supabase direct/Postgres URL) used for migrations

## Migration

Initial migration is checked in at:

- `prisma/migrations/20260418160000_init/migration.sql`

Apply with:

```bash
npx prisma migrate deploy
```

## Seed strategy

This app treats role and ISO clause reference data as seed-managed metadata.

- `prisma/seed.ts` upserts immutable role records (`ADMIN`, `STAFF`, `VIEWER`).
- `prisma/seed/iso-clauses.json` stores ISO clause starter data.
- The seed script upserts by stable keys (`Role.code`, `IsoClause.clauseCode`) so re-runs are safe.

Run seed:

```bash
npm run prisma:seed
```

You can replace `prisma/seed/iso-clauses.json` with your full ISO 9001 clause catalog when ready.
