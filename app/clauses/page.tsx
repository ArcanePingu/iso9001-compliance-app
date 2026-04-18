import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { getClauseListData } from "@/lib/queries/clauses";
import type { ClauseListFilters } from "@/types/clauses";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  COMPLIANT: "Compliant",
  NON_COMPLIANT: "Non-compliant",
  OBSERVATION: "Observation",
  CLOSED: "Closed",
  NO_RECORD: "No record",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLIANT: "bg-emerald-100 text-emerald-700",
  NON_COMPLIANT: "bg-red-100 text-red-700",
  OBSERVATION: "bg-amber-100 text-amber-700",
  CLOSED: "bg-zinc-100 text-zinc-700",
  NO_RECORD: "bg-neutral-100 text-neutral-700",
};

function formatReviewDate(value: Date | null) {
  if (!value) {
    return "Not scheduled";
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

export default async function ClausesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: ClauseListFilters = {
    query: typeof params.query === "string" ? params.query : undefined,
    status: typeof params.status === "string" ? (params.status as ClauseListFilters["status"]) : "ALL",
    siteId: typeof params.site === "string" ? params.site : "ALL",
    ownerId: typeof params.owner === "string" ? params.owner : "ALL",
  };

  const { clauses, options } = await getClauseListData(filters);

  return (
    <AppShell>
      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">ISO Clauses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search and monitor clause-level compliance status, ownership, and outstanding actions.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{clauses.length} clause(s)</p>
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
              placeholder="Clause, title, keyword, owner"
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
            <Link className="rounded-md border px-4 py-2 text-sm font-medium" href="/clauses">
              Reset
            </Link>
          </div>
        </form>

        {clauses.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center">
            <h2 className="text-base font-semibold text-foreground">No clauses match your filters</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clearing one or more filters, or broaden your search terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Clause</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Review date</th>
                  <th className="px-4 py-3 font-medium">Linked sites</th>
                  <th className="px-4 py-3 font-medium">Open actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {clauses.map((clause) => (
                  <tr className="hover:bg-muted/40" key={clause.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link className="underline-offset-4 hover:underline" href={`/clauses/${clause.id}`}>
                        {clause.clauseCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{clause.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[clause.status]}`}>
                        {STATUS_LABELS[clause.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{clause.ownerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatReviewDate(clause.reviewDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {clause.linkedSiteNames.length === 0 ? (
                        "No linked sites"
                      ) : (
                        <span title={clause.linkedSiteNames.join(", ")}>
                          {clause.linkedSiteNames.length} site(s)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{clause.openActionsCount}</td>
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
