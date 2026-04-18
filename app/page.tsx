import Link from "next/link";

import { ActionStatus, ComplianceStatus } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

const OPEN_ACTION_STATUSES: ActionStatus[] = ["OPEN", "IN_PROGRESS", "BLOCKED"];

const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  COMPLIANT: "Compliant",
  NON_COMPLIANT: "Non-compliant",
  OBSERVATION: "Observation",
  CLOSED: "Closed",
};

const COMPLIANCE_STATUS_STYLES: Record<ComplianceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLIANT: "bg-emerald-100 text-emerald-700",
  NON_COMPLIANT: "bg-red-100 text-red-700",
  OBSERVATION: "bg-amber-100 text-amber-700",
  CLOSED: "bg-zinc-100 text-zinc-700",
};

const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function renderCountBar(value: number, maxValue: number) {
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 0;

  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-2 rounded-full bg-primary/70"
        style={{
          width: `${width}%`,
        }}
      />
    </div>
  );
}

export default async function HomePage() {
  const now = new Date();

  const [
    clauses,
    complianceStatusGroups,
    overdueReviews,
    openActions,
    recentAuditLogs,
    sites,
    ownerProfiles,
  ] = await Promise.all([
    prisma.isoClause.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        clauseNumber: true,
        complianceRecords: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            status: true,
            createdByProfileId: true,
            dueDate: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { clauseNumber: "asc" }],
    }),
    prisma.complianceRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.complianceRecord.findMany({
      where: {
        dueDate: { lt: now },
        status: {
          in: ["DRAFT", "IN_PROGRESS", "NON_COMPLIANT", "OBSERVATION"],
        },
      },
      include: {
        isoClause: {
          select: { id: true, clauseNumber: true, title: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    prisma.action.findMany({
      where: { status: { in: OPEN_ACTION_STATUSES } },
      include: {
        complianceRecord: {
          include: {
            isoClause: { select: { id: true, clauseNumber: true, title: true } },
          },
        },
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 10,
    }),
    prisma.auditLog.findMany({
      orderBy: { changedAt: "desc" },
      take: 8,
      include: {
        changedBy: {
          select: { fullName: true, email: true },
        },
      },
    }),
    prisma.site.findMany({
      where: { isActive: true },
      include: {
        complianceRecordSites: {
          include: {
            complianceRecord: {
              select: {
                status: true,
                dueDate: true,
              },
            },
          },
        },
        actionSites: {
          include: {
            action: {
              select: {
                status: true,
                dueDate: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.profile.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const complianceStatusCounts = Object.values(ComplianceStatus).reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<ComplianceStatus, number>,
  );

  for (const group of complianceStatusGroups) {
    complianceStatusCounts[group.status] = group._count._all;
  }

  const clauseStatusCounts = Object.values(ComplianceStatus).reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<ComplianceStatus, number>,
  );
  let clausesWithoutRecord = 0;

  for (const clause of clauses) {
    const latestStatus = clause.complianceRecords[0]?.status;

    if (!latestStatus) {
      clausesWithoutRecord += 1;
      continue;
    }

    clauseStatusCounts[latestStatus] += 1;
  }

  const maxClauseStatusCount = Math.max(...Object.values(clauseStatusCounts), clausesWithoutRecord, 1);

  const openActionCount = openActions.length;
  const overdueActionCount = openActions.filter((action) => action.dueDate && action.dueDate < now).length;

  const siteSummary = sites.map((site) => {
    const linkedRecords = site.complianceRecordSites.map((item) => item.complianceRecord);
    const linkedActions = site.actionSites.map((item) => item.action);

    return {
      id: site.id,
      name: site.name,
      records: linkedRecords.length,
      overdueReviews: linkedRecords.filter(
        (record) =>
          record.dueDate &&
          record.dueDate < now &&
          ["DRAFT", "IN_PROGRESS", "NON_COMPLIANT", "OBSERVATION"].includes(record.status),
      ).length,
      openActions: linkedActions.filter((action) => OPEN_ACTION_STATUSES.includes(action.status)).length,
      overdueActions: linkedActions.filter(
        (action) => action.dueDate && action.dueDate < now && OPEN_ACTION_STATUSES.includes(action.status),
      ).length,
    };
  });

  const ownerSummary = ownerProfiles
    .map((owner) => {
      const ownedRecords = clauses
        .map((clause) => clause.complianceRecords[0])
        .filter((record) => record?.createdByProfileId === owner.id);

      const openAssignedActions = openActions.filter((action) => action.assignedToProfileId === owner.id);

      return {
        id: owner.id,
        label: owner.fullName ?? owner.email ?? "Unknown owner",
        clauseCount: ownedRecords.length,
        overdueReviews: ownedRecords.filter((record) => record?.dueDate && record.dueDate < now).length,
        openAssignedActions: openAssignedActions.length,
      };
    })
    .filter((owner) => owner.clauseCount > 0 || owner.openAssignedActions > 0)
    .sort((a, b) => b.clauseCount + b.openAssignedActions - (a.clauseCount + a.openAssignedActions))
    .slice(0, 8);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(complianceStatusCounts).map(([status, count]) => (
            <article className="rounded-lg border bg-card p-5 shadow-panel" key={status}>
              <p className="text-sm font-medium text-muted-foreground">{COMPLIANCE_STATUS_LABELS[status as ComplianceStatus]}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{count}</p>
              <Link className="mt-3 inline-block text-xs text-primary hover:underline" href={`/clauses?status=${status}`}>
                View clauses
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-lg border bg-card p-6 shadow-panel xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Clauses by latest status</h2>
              <Link className="text-xs text-primary hover:underline" href="/clauses">
                Open clause register
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {Object.values(ComplianceStatus).map((status) => (
                <div className="grid grid-cols-[140px_1fr_36px] items-center gap-3" key={status}>
                  <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium ${COMPLIANCE_STATUS_STYLES[status]}`}>
                    {COMPLIANCE_STATUS_LABELS[status]}
                  </span>
                  {renderCountBar(clauseStatusCounts[status], maxClauseStatusCount)}
                  <span className="text-right text-sm font-medium">{clauseStatusCounts[status]}</span>
                </div>
              ))}

              <div className="grid grid-cols-[140px_1fr_36px] items-center gap-3">
                <span className="inline-flex w-fit rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">No record</span>
                {renderCountBar(clausesWithoutRecord, maxClauseStatusCount)}
                <span className="text-right text-sm font-medium">{clausesWithoutRecord}</span>
              </div>
            </div>
          </article>

          <article className="rounded-lg border bg-card p-6 shadow-panel">
            <h2 className="text-base font-semibold">Open actions snapshot</h2>
            <p className="mt-1 text-sm text-muted-foreground">Track active corrective and preventive work.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-md border bg-background/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Open actions</p>
                <p className="mt-1 text-2xl font-semibold">{openActionCount}</p>
              </div>
              <div className="rounded-md border bg-background/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue actions</p>
                <p className="mt-1 text-2xl font-semibold text-red-700">{overdueActionCount}</p>
              </div>
            </div>
            <Link className="mt-4 inline-block text-xs text-primary hover:underline" href="/actions">
              Review action list
            </Link>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-lg border bg-card p-6 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Overdue reviews</h2>
              <Link className="text-xs text-primary hover:underline" href="/clauses">
                View all clauses
              </Link>
            </div>

            {overdueReviews.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No overdue clause reviews. Great job keeping reviews up to date.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Clause</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                      <th className="px-3 py-2 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {overdueReviews.map((record) => (
                      <tr className="hover:bg-muted/30" key={record.id}>
                        <td className="px-3 py-2">
                          <Link className="font-medium hover:underline" href={`/clauses/${record.isoClause.id}`}>
                            {record.isoClause.clauseNumber}
                          </Link>
                          <p className="text-xs text-muted-foreground">{record.isoClause.title}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {record.createdBy?.fullName ?? record.createdBy?.email ?? "Unassigned"}
                        </td>
                        <td className="px-3 py-2 text-red-700">{formatDate(record.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-lg border bg-card p-6 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Open actions</h2>
              <Link className="text-xs text-primary hover:underline" href="/actions">
                Open actions page
              </Link>
            </div>

            {openActions.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No open actions right now.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                      <th className="px-3 py-2 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {openActions.map((action) => (
                      <tr className="hover:bg-muted/30" key={action.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{action.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Clause {action.complianceRecord.isoClause.clauseNumber}: {action.complianceRecord.isoClause.title}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{ACTION_STATUS_LABELS[action.status]}</td>
                        <td className="px-3 py-2 text-muted-foreground">{action.assignedTo?.fullName ?? action.assignedTo?.email ?? "Unassigned"}</td>
                        <td className={`px-3 py-2 ${action.dueDate && action.dueDate < now ? "text-red-700" : "text-muted-foreground"}`}>
                          {formatDate(action.dueDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-lg border bg-card p-6 shadow-panel xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Site-based summary</h2>
              <Link className="text-xs text-primary hover:underline" href="/admin/sites">
                Manage sites
              </Link>
            </div>

            {siteSummary.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No active sites found. Add sites to start site-level tracking.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Site</th>
                      <th className="px-3 py-2 font-medium">Records</th>
                      <th className="px-3 py-2 font-medium">Overdue reviews</th>
                      <th className="px-3 py-2 font-medium">Open actions</th>
                      <th className="px-3 py-2 font-medium">Overdue actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {siteSummary.map((site) => (
                      <tr className="hover:bg-muted/30" key={site.id}>
                        <td className="px-3 py-2 font-medium">{site.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{site.records}</td>
                        <td className="px-3 py-2 text-muted-foreground">{site.overdueReviews}</td>
                        <td className="px-3 py-2 text-muted-foreground">{site.openActions}</td>
                        <td className={`px-3 py-2 ${site.overdueActions > 0 ? "text-red-700" : "text-muted-foreground"}`}>{site.overdueActions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-lg border bg-card p-6 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent updates</h2>
              <Link className="text-xs text-primary hover:underline" href="/admin/audit-logs">
                Audit logs
              </Link>
            </div>

            {recentAuditLogs.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed p-6 text-sm text-muted-foreground">No updates logged yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentAuditLogs.map((item) => (
                  <li className="rounded-md border bg-background/60 p-3" key={item.id}>
                    <p className="text-sm font-medium">
                      {item.entityType.replaceAll("_", " ")} · {item.actionType}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.fieldName.replaceAll("_", " ")} · {item.changedBy?.fullName ?? item.changedBy?.email ?? "System"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.changedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="rounded-lg border bg-card p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Owner-based summary</h2>
            <Link className="text-xs text-primary hover:underline" href="/clauses">
              Filter by owner
            </Link>
          </div>

          {ownerSummary.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No owner-linked records or actions available yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Clauses owned</th>
                    <th className="px-3 py-2 font-medium">Overdue reviews</th>
                    <th className="px-3 py-2 font-medium">Open assigned actions</th>
                    <th className="px-3 py-2 font-medium">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {ownerSummary.map((owner) => (
                    <tr className="hover:bg-muted/30" key={owner.id}>
                      <td className="px-3 py-2 font-medium">{owner.label}</td>
                      <td className="px-3 py-2 text-muted-foreground">{owner.clauseCount}</td>
                      <td className={`px-3 py-2 ${owner.overdueReviews > 0 ? "text-red-700" : "text-muted-foreground"}`}>{owner.overdueReviews}</td>
                      <td className="px-3 py-2 text-muted-foreground">{owner.openAssignedActions}</td>
                      <td className="px-3 py-2">
                        <Link className="text-xs text-primary hover:underline" href={`/clauses?owner=${owner.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
