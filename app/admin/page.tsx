import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [userCount, activeSiteCount, auditLogCount, clauseCount] = await Promise.all([
    prisma.profile.count(),
    prisma.site.count({ where: { isActive: true } }),
    prisma.auditLog.count(),
    prisma.isoClause.count({ where: { isActive: true } }),
  ]);

  return (
    <section className="space-y-6 rounded-lg border bg-card p-6 shadow-panel">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold">Admin workspace</h1>
          <p className="text-sm text-muted-foreground">
            Manage access, sites, and reference data for ISO 9001 operations.
          </p>
        </div>
        <AdminNav currentPath="/admin" />
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-md border bg-background/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Profiles</p>
          <p className="mt-2 text-2xl font-semibold">{userCount}</p>
          <Link className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline" href="/admin/users">
            Manage users
          </Link>
        </article>

        <article className="rounded-md border bg-background/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Active sites</p>
          <p className="mt-2 text-2xl font-semibold">{activeSiteCount}</p>
          <Link className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline" href="/admin/sites">
            Manage sites
          </Link>
        </article>

        <article className="rounded-md border bg-background/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Audit entries</p>
          <p className="mt-2 text-2xl font-semibold">{auditLogCount}</p>
          <Link className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline" href="/admin/audit-logs">
            View audit log
          </Link>
        </article>

        <article className="rounded-md border bg-background/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Active clauses</p>
          <p className="mt-2 text-2xl font-semibold">{clauseCount}</p>
          <Link className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline" href="/admin/clauses">
            View clause library
          </Link>
        </article>
      </div>
    </section>
  );
}
