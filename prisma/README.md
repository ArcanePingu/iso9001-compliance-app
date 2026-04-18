# Prisma + Supabase Postgres setup

## Environment variables

Set these before running Prisma commands:

- `DATABASE_URL`: pooled connection string (Supabase transaction/pooler URL)
- `DIRECT_URL`: direct connection string (Supabase direct/Postgres URL) used for migrations

## Migration

Migrations are checked in at:

- `prisma/migrations/20260418160000_init/migration.sql`
- `prisma/migrations/20260418183000_iso_clause_library_import/migration.sql`

Apply with:

```bash
npx prisma migrate deploy
```

## ISO clause reference dataset location

Store your canonical ISO clause JSON dataset at:

- `prisma/seed/iso-clauses.json`

A minimal sample/template is provided at:

- `prisma/seed/iso-clauses.sample.json`

The import format is:

```json
[
  {
    "clauseNumber": "4.1",
    "title": "Understanding the organization and its context",
    "plainEnglishExplanation": "Simple plain-English guidance",
    "requirementSummary": "Short formal requirement summary",
    "parentClauseNumber": null,
    "sortOrder": 1
  }
]
```

## Seed and import strategy

This app treats role and ISO clause data as **reference metadata**.
Business compliance records remain in `ComplianceRecord` and link to `IsoClause` by `isoClauseId`.

- `prisma/seed.ts` upserts immutable role records (`ADMIN`, `STAFF`, `VIEWER`).
- `prisma/import-iso-clauses.ts` imports ISO clauses from JSON.
- `prisma/seed/iso-clauses.json` is the reference clause dataset.
- The importer is idempotent and safe to re-run:
  - upserts by stable key `IsoClause.clauseNumber`
  - updates mutable text/order fields
  - applies `parentClauseId` in a second pass using `parentClauseNumber`

## How to run import

Use either approach:

```bash
# Full seed: roles + ISO clause library
npx tsx prisma/seed.ts

# ISO clause library only (optionally pass a different JSON file)
npx tsx prisma/import-iso-clauses.ts prisma/seed/iso-clauses.json
```

## Replacing with spreadsheet-derived data

1. Convert your spreadsheet to the JSON shape above.
2. Save it to `prisma/seed/iso-clauses.json`.
3. Run `npx tsx prisma/import-iso-clauses.ts prisma/seed/iso-clauses.json`.
4. Re-run anytime; existing clauses are updated, new clauses are inserted.
