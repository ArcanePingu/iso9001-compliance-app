import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminClauseLibraryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = typeof params.query === "string" ? params.query.trim() : "";

  const clauses = await prisma.isoClause.findMany({
    where: {
      OR: query
        ? [
            { clauseNumber: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ sortOrder: "asc" }, { clauseNumber: "asc" }],
    take: 200,
    select: {
      id: true,
      clauseNumber: true,
      title: true,
      requirementSummary: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return (
    <section className="space-y-6 rounded-lg border bg-card p-6 shadow-panel">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold">Clause library (read-only)</h1>
          <p className="text-sm text-muted-foreground">
            For MVP safety, this view is intentionally read-only and supports search only.
          </p>
        </div>
        <AdminNav currentPath="/admin/clauses" />
      </header>

      <form className="grid gap-3 rounded-md border bg-background/50 p-4 md:grid-cols-4" method="get">
        <label className="md:col-span-3">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Search clauses</span>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            defaultValue={query}
            name="query"
            placeholder="Clause number or title"
            type="text"
          />
        </label>
        <div className="flex items-end gap-2">
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" type="submit">Search</button>
          <Link className="rounded-md border px-4 py-2 text-sm font-medium" href="/admin/clauses">Reset</Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-background/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Clause</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Requirement summary</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {clauses.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-muted-foreground" colSpan={4}>No clauses found for this search.</td>
              </tr>
            ) : clauses.map((clause) => (
              <tr className="border-t" key={clause.id}>
                <td className="px-3 py-2 font-medium">{clause.clauseNumber}</td>
                <td className="px-3 py-2">{clause.title}</td>
                <td className="px-3 py-2 text-muted-foreground">{clause.requirementSummary ?? "No summary provided."}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${clause.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}>
                    {clause.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
