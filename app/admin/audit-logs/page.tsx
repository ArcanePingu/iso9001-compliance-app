import Link from "next/link";
import { EntityType } from "@prisma/client";

import { AdminNav } from "@/components/admin/admin-nav";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const entityType = typeof resolvedSearchParams.entityType === "string"
    ? resolvedSearchParams.entityType
    : "";
  const changedBy = typeof resolvedSearchParams.changedBy === "string"
    ? resolvedSearchParams.changedBy
    : "";
  const from = typeof resolvedSearchParams.from === "string" ? resolvedSearchParams.from : "";

  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const validFromDate = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;

  const [profiles, auditLogs] = await Promise.all([
    prisma.profile.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.auditLog.findMany({
      where: {
        entityType: entityType && entityType in EntityType
          ? (entityType as EntityType)
          : undefined,
        changedByProfileId: changedBy || undefined,
        changedAt: validFromDate ? { gte: validFromDate } : undefined,
      },
      include: {
        changedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        changedAt: "desc",
      },
      take: 200,
    }),
  ]);

  return (
    <section className="space-y-6 rounded-lg border bg-card p-6 shadow-panel">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Audit log</h1>
              <p className="text-sm text-muted-foreground">Recent change history across entities.</p>
            </div>
            <Link className="rounded-md border px-3 py-2 text-sm" href="/admin">
              Back to admin
            </Link>
          </div>
          <AdminNav currentPath="/admin/audit-logs" />
        </header>

        <form className="grid gap-3 rounded-md border bg-background/40 p-4 md:grid-cols-4" method="get">
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Entity type</span>
            <select className="w-full rounded-md border bg-background px-2 py-1" defaultValue={entityType} name="entityType">
              <option value="">All</option>
              {Object.values(EntityType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Changed by</span>
            <select className="w-full rounded-md border bg-background px-2 py-1" defaultValue={changedBy} name="changedBy">
              <option value="">All users</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName ?? profile.email ?? profile.id}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">From date</span>
            <input className="w-full rounded-md border bg-background px-2 py-1" defaultValue={from} name="from" type="date" />
          </label>

          <div className="flex items-end gap-2">
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">Apply filters</button>
            <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/audit-logs">Clear</Link>
          </div>
        </form>

        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-background/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Old</th>
                <th className="px-3 py-2">New</th>
                <th className="px-3 py-2">Changed by</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={7}>No audit rows match the current filters.</td>
                </tr>
              ) : auditLogs.map((log) => (
                <tr className="border-t" key={log.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(log.changedAt)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{log.entityType} · {log.entityId.slice(0, 8)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{log.actionType}</td>
                  <td className="px-3 py-2">{log.fieldName}</td>
                  <td className="px-3 py-2">{log.oldValue ?? "—"}</td>
                  <td className="px-3 py-2">{log.newValue ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{log.changedBy?.fullName ?? log.changedBy?.email ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </section>
  );
}
