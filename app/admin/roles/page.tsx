import { RoleCode } from "@prisma/client";

import { AdminNav } from "@/components/admin/admin-nav";
import { prisma } from "@/lib/prisma";

import { seedRoleDescriptionsAction } from "../actions";

const ROLE_DEFAULT_LABELS: Record<RoleCode, string> = {
  ADMIN: "Administrator",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : null;
  const message = typeof params.message === "string" ? params.message : null;

  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          profiles: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return (
    <section className="space-y-6 rounded-lg border bg-card p-6 shadow-panel">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Role management</h1>
            <p className="text-sm text-muted-foreground">
              View role definitions and user counts. Assignment is handled on the Users page.
            </p>
          </div>
          <form action={seedRoleDescriptionsAction}>
            <button className="rounded-md border px-3 py-2 text-sm font-medium" type="submit">
              Fill missing descriptions
            </button>
          </form>
        </div>
        <AdminNav currentPath="/admin/roles" />
      </header>

      {status && message ? (
        <p className={`rounded-md border px-3 py-2 text-sm ${status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <article className="rounded-md border bg-background/40 p-4" key={role.id}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{role.code}</p>
            <h2 className="mt-1 text-base font-semibold">{role.name || ROLE_DEFAULT_LABELS[role.code]}</h2>
            <p className="mt-2 min-h-12 text-sm text-muted-foreground">
              {role.description ?? "No description provided yet."}
            </p>
            <p className="mt-3 text-sm font-medium">Assigned profiles: {role._count.profiles}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
