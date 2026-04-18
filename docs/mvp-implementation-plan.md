# ISO 9001 Compliance App — MVP Implementation Plan

## 1) Current Repository Assessment

- Repository is currently a clean baseline with no app scaffolded yet.
- This is a good point to establish architecture and guardrails before implementation.

## 2) MVP Build Strategy (Phased)

### Phase 0 — Foundation & Scaffolding

1. Initialize Next.js (App Router) with TypeScript and Tailwind CSS.
2. Add and configure shadcn/ui with a minimal design system setup.
3. Add Prisma with PostgreSQL datasource (Supabase connection string).
4. Add Supabase client utilities for:
   - server components
   - route handlers
   - middleware auth checks
5. Add baseline project conventions:
   - ESLint + Prettier (or equivalent style baseline)
   - environment variable schema validation
   - typed configuration module

Deliverable: runnable app shell with authenticated layout and database connectivity.

---

### Phase 1 — Domain Model & Data Separation

Implement strict separation between ISO reference data and business compliance data.

#### Reference data (read-mostly)

- `iso_clauses`
  - id
  - code (e.g., "4", "4.1", "8.5.1")
  - title
  - description
  - parent_id (nullable, self-reference)
  - sort_order
  - level

This table is seeded and treated as controlled reference content.

#### Business data (tenant/company scope — one company for MVP)

- `companies` (single row for now, future-proof)
- `sites`
- `users` (linked to Supabase auth user id)
- `user_roles` (`admin`, `staff`, `viewer`)
- `clause_records`
  - links a company to an `iso_clause`
  - status
  - owner_user_id
  - process_description
  - evidence_summary
  - timestamps
- `clause_record_sites` (many-to-many between clause records and sites)
- `evidence_links`
  - url/path only
  - label
- `comments`
- `actions`
  - gap/action description
  - owner
  - due_date
  - status
- `notifications`
- `audit_logs`

Deliverable: Prisma schema + initial migration + seed script for ISO clause library.

---

### Phase 2 — Auth, Roles, and Authorization

Use Supabase Auth for identity and app-level role checks in server-side logic.

- Role rules:
  - `admin`: full access; manage users/roles/sites/reference visibility/audit logs.
  - `staff`: read + edit compliance records, comments, actions.
  - `viewer`: read-only.
- Enforce permissions in server actions / route handlers, not only UI.
- Add middleware for route protection and session checks.

Deliverable: secure role-based access controls for all protected operations.

---

### Phase 3 — Core UI/UX Features

#### Information architecture

- Dashboard
  - status summary tiles
  - recently updated clauses
  - pending actions
- Clause Library page
  - hierarchical list/tree with search/filter
- Clause Detail page (`/clauses/[clauseCode]` or `/clauses/[id]`)
  - ISO clause reference panel (read-only)
  - compliance record editor panel
  - linked sites selector (multi-select)
  - evidence links section
  - comments timeline
  - actions/gaps list

#### Required status values

- Not Started
- In Progress
- Compliant
- Partially Compliant
- Not Compliant
- Not Applicable

Represent statuses as a constrained enum in DB + TS union/enum in app layer.

Deliverable: end-to-end ability to view clauses and create/update compliance records.

---

### Phase 4 — Audit Trail & Notifications

#### Audit logging

Track important changes at minimum for:
- status changes
- owner changes
- evidence link create/update/delete
- actions create/update/delete/complete
- role/site administration changes

Audit entry shape:
- actor_user_id
- entity_type
- entity_id
- event_type
- old_value (JSON)
- new_value (JSON)
- timestamp

#### In-app notifications

Initial notification triggers:
- action assigned to a user
- action due soon/overdue
- compliance record updated where user is owner/watcher (simple rule-based)

Deliverable: reliable append-only audit trail + basic notifications list and unread marker.

---

### Phase 5 — Admin Surface

Admin sections:
- User management (invite placeholder if email flow deferred)
- Role assignment
- Site management
- Clause library access management (MVP can be simple visibility flag set)
- Audit log viewer with filtering

Deliverable: admin-only screens and server-side enforcement.

---

### Phase 6 — Quality Hardening & Deployment

- Server-side validation with Zod for all write operations.
- Add optimistic but safe UI patterns (loading/error states).
- Add integration tests for critical flows:
  - permission enforcement
  - clause record lifecycle
  - audit generation
- Add seed scripts for local/demo environment.
- Vercel deployment setup:
  - env vars
  - build checks
  - database migration strategy

Deliverable: production-quality MVP baseline deployable to Vercel.

## 3) Proposed Folder Structure

```text
src/
  app/
    (auth)/
    (protected)/
      dashboard/
      clauses/
      admin/
  components/
    ui/
    clauses/
    actions/
    comments/
    layout/
  lib/
    auth/
    db/
    permissions/
    validation/
    audit/
    notifications/
  server/
    actions/
    queries/
  types/
prisma/
  schema.prisma
  seed/
```

## 4) Data & Validation Rules (MVP)

- `clause_records` unique per `(company_id, clause_id)` for canonical record behavior.
- `clause_record_sites` allows 0..n linked sites.
- Evidence must be URL/path strings; no binaries.
- All mutating operations validate payloads server-side.
- Viewer role blocked from all mutations.

## 5) Recommended Build Order (Concrete)

1. Scaffold Next.js + Tailwind + shadcn/ui.
2. Configure Prisma + Supabase Postgres; create schema.
3. Seed ISO clauses/subclauses.
4. Implement auth + role guard utilities.
5. Build clause list and clause detail pages.
6. Implement clause record editing (status/owner/process/evidence/sites).
7. Add comments and actions modules.
8. Add audit log hooks on mutations.
9. Add notifications.
10. Build admin pages.
11. Add tests + deployment readiness tasks.

## 6) Risks & Mitigations

- **Risk:** role checks only in UI.
  - **Mitigation:** central permission checks in server actions/handlers.
- **Risk:** ISO reference data modified accidentally.
  - **Mitigation:** isolate tables + restrict write paths to admin/seed tooling.
- **Risk:** audit log gaps.
  - **Mitigation:** shared mutation wrapper that emits audit events.
- **Risk:** schema complexity too early.
  - **Mitigation:** keep workflow simple (no approvals in MVP), expand later.

## 7) Next Implementation Step

After approval, begin **Phase 0 + Phase 1** in a single first build iteration:
- scaffold app,
- create Prisma schema,
- seed ISO clause reference data,
- establish auth/role foundations.
