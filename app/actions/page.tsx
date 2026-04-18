import Link from "next/link";
import { ActionStatus } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { getActionListData } from "@/lib/queries/actions";
import { requireAuth } from "@/lib/auth";
import type { ActionListFilters } from "@/types/actions";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-red-100 text-red-700",
  DONE: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-zinc-100 text-zinc-700",
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

function getFilterValue(value?: string) {
  if (!value) {
    return "ALL";
  }

  return value;
}

function parseStatusFilter(value: string | string[] | undefined): ActionListFilters["status"] {
  if (typeof value !== "string" || value === "ALL") {
    return "ALL";
  }

  return Object.values(ActionStatus).includes(value as ActionStatus)
    ? (value as ActionStatus)
    : "ALL";
}

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth({ permission: "read_compliance" });
  const params = await searchParams;

  const filters: ActionListFilters = {
    query: typeof params.query === "string" ? params.query : undefined,
    status: parseStatusFilter(params.status),
    siteId: typeof params.site === "string" ? params.site : "ALL",
    ownerId: typeof params.owner === "string" ? params.owner : "ALL",
  };

  const { actions, options } = await getActionListData(filters);

  return (
    <AppShell>
      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Actions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search and filter actions by clause, keyword, process context, evidence links, site, and owner.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{actions.length} action(s)</p>
        </div>

        <form className="grid gap-3 rounded-md border bg-background/60 p-4 md:grid-cols-5" method="get">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="query">
              Search
            </label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={filters.query ?? ""}
              id="query"
              name="query"
              placeholder="Clause #, title, keyword, process, evidence, site, owner"
              type="text"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="status">
              Status
            </label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={getFilterValue(filters.status)} id="status" name="status">
              <option value="ALL">All statuses</option>
              {options.statuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="site">
              Site
            </label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={getFilterValue(filters.siteId)} id="site" name="site">
              <option value="ALL">All sites</option>
              {options.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="owner">
              Owner
            </label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={getFilterValue(filters.ownerId)} id="owner" name="owner">
              <option value="ALL">All owners</option>
              {options.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5 flex gap-2">
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" type="submit">
              Apply filters
            </button>
            <Link className="rounded-md border px-4 py-2 text-sm font-medium" href="/actions">
              Reset
            </Link>
          </div>
        </form>

        {actions.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center">
            <h2 className="text-base font-semibold text-foreground">No actions match your filters</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clearing one or more filters, or broaden your search terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Clause</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Sites</th>
                  <th className="px-4 py-3 font-medium">Evidence path/link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {actions.map((action) => (
                  <tr className="hover:bg-muted/40" key={action.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{action.title}</td>
                    <td className="px-4 py-3 text-foreground">
                      <Link className="underline-offset-4 hover:underline" href={`/clauses/${action.clauseId}`}>
                        {action.clauseNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{action.clauseTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[action.status]}`}>
                        {STATUS_LABELS[action.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{action.ownerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(action.dueDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {action.siteNames.length === 0 ? "No linked sites" : action.siteNames.join(", ")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {action.evidencePath ? (
                        <span className="line-clamp-1" title={action.evidencePath}>
                          {action.evidencePath}
                        </span>
                      ) : (
                        "Not provided"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
