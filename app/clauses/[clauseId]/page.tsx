import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

export default async function ClauseDetailPage({
  params,
}: {
  params: Promise<{ clauseId: string }>;
}) {
  const { clauseId } = await params;

  const clause = await prisma.isoClause.findUnique({
    where: { id: clauseId },
    include: {
      complianceRecords: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!clause) {
    notFound();
  }

  const latestRecord = clause.complianceRecords[0];

  return (
    <AppShell>
      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Clause {clause.clauseCode}</p>
            <h1 className="text-xl font-semibold">{clause.title}</h1>
          </div>
          <Link className="rounded-md border px-3 py-2 text-sm" href="/clauses">
            Back to clauses
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          {clause.description ?? "No description has been provided for this clause yet."}
        </p>

        <div className="grid gap-3 rounded-md border bg-background/50 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current status</p>
            <p className="mt-1 text-sm font-medium">{latestRecord?.status ?? "No compliance record"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Review date</p>
            <p className="mt-1 text-sm font-medium">
              {latestRecord?.dueDate
                ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(latestRecord.dueDate)
                : "Not scheduled"}
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
