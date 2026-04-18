import { AdminNav } from "@/components/admin/admin-nav";
import { StatusMessage } from "@/components/ui/status-message";
import { prisma } from "@/lib/prisma";

import { createSiteAction, updateSiteAction } from "../actions";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : null;
  const message = typeof params.message === "string" ? params.message : null;

  const sites = await prisma.site.findMany({
    include: {
      _count: {
        select: {
          complianceRecordSites: true,
          actionSites: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <section className="space-y-6 rounded-lg border bg-card p-6 shadow-panel">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold">Site management</h1>
          <p className="text-sm text-muted-foreground">
            Create and edit operational sites used by compliance records and actions.
          </p>
        </div>
        <AdminNav currentPath="/admin/sites" />
      </header>

      {status && message ? <StatusMessage message={message} status={status === "error" ? "error" : "success"} /> : null}

      <section className="rounded-md border bg-background/40 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Create site</h2>
        <form action={createSiteAction} className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Code</span>
            <input className="w-full rounded-md border bg-background px-3 py-2" maxLength={20} name="code" pattern="[A-Za-z0-9_-]+" placeholder="NYC-01" required title="Use letters, numbers, hyphens, or underscores." type="text" />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Name</span>
            <input className="w-full rounded-md border bg-background px-3 py-2" maxLength={120} name="name" placeholder="New York Facility" required type="text" />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Location</span>
            <input className="w-full rounded-md border bg-background px-3 py-2" name="location" placeholder="New York, NY" type="text" />
          </label>

          <div className="md:col-span-4">
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" type="submit">Add site</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Existing sites</h2>

        {sites.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No sites have been created yet.</p>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <form action={updateSiteAction} className="grid gap-3 rounded-md border bg-background/30 p-4 lg:grid-cols-12" key={site.id}>
                <input name="siteId" type="hidden" value={site.id} />

                <label className="text-sm lg:col-span-2">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Code</span>
                  <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={site.code} maxLength={20} name="code" pattern="[A-Za-z0-9_-]+" required title="Use letters, numbers, hyphens, or underscores." type="text" />
                </label>

                <label className="text-sm lg:col-span-3">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Name</span>
                  <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={site.name} maxLength={120} name="name" required type="text" />
                </label>

                <label className="text-sm lg:col-span-3">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Location</span>
                  <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={site.location ?? ""} name="location" type="text" />
                </label>

                <label className="text-sm lg:col-span-2">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Status</span>
                  <select className="w-full rounded-md border bg-background px-3 py-2" defaultValue={String(site.isActive)} name="isActive">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>

                <div className="flex items-end lg:col-span-2">
                  <button className="w-full rounded-md border px-3 py-2 text-sm font-medium" type="submit">Save</button>
                </div>

                <p className="text-xs text-muted-foreground lg:col-span-12">
                  Linked compliance records: {site._count.complianceRecordSites} · Linked actions: {site._count.actionSites} · Updated {formatDateTime(site.updatedAt)}
                </p>
              </form>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
