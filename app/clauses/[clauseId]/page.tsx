import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission, requireAuth } from "@/lib/auth";

import { AppShell } from "@/components/layout/app-shell";
import { resolveCommentAuthorName } from "@/lib/comments";
import { prisma } from "@/lib/prisma";

import { ClauseRecordForm } from "./_components/clause-record-form";
import { ComplianceComments } from "./_components/compliance-comments";
import { ensureClauseRecordForPage } from "./actions";

function formatDate(value?: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value);
}

function formatDateTime(value?: Date | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatDateInputValue(value?: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

type ParsedRecordDetails = {
  reviewDate: string | null;
  processProcedures: string;
  processMeetsRequirement: string;
  evidencePaths: string;
  gapActionNeeded: string;
};

function parseRecordDetails(raw?: string | null): ParsedRecordDetails {
  if (!raw) {
    return {
      reviewDate: null,
      processProcedures: "",
      processMeetsRequirement: "",
      evidencePaths: "",
      gapActionNeeded: "",
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ParsedRecordDetails>;
    return {
      reviewDate: parsed.reviewDate ?? null,
      processProcedures: parsed.processProcedures ?? "",
      processMeetsRequirement: parsed.processMeetsRequirement ?? "",
      evidencePaths: parsed.evidencePaths ?? "",
      gapActionNeeded: parsed.gapActionNeeded ?? "",
    };
  } catch {
    return {
      reviewDate: null,
      processProcedures: raw,
      processMeetsRequirement: "",
      evidencePaths: "",
      gapActionNeeded: "",
    };
  }
}

export default async function ClauseDetailPage({
  params,
}: {
  params: Promise<{ clauseId: string }>;
}) {
  const { role } = await requireAuth({ permission: "read_compliance" });
  const canEdit = role ? hasPermission(role, "edit_compliance") : false;
  const canComment = role ? hasPermission(role, "edit_comments") : false;

  const { clauseId } = await params;

  await ensureClauseRecordForPage(clauseId);

  const clause = await prisma.isoClause.findUnique({
    where: { id: clauseId },
    include: {
      complianceRecords: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          sites: {
            include: {
              site: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          comments: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              author: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          actions: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 5,
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!clause) {
    notFound();
  }

  const [profiles, sites] = await Promise.all([
    prisma.profile.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.site.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const latestRecord = clause.complianceRecords[0];
  const details = parseRecordDetails(latestRecord?.details);

  const auditHistory = latestRecord
    ? await prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: "COMPLIANCE_RECORD", entityId: latestRecord.id },
            { entityType: "ISO_CLAUSE", entityId: clause.id },
          ],
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
        take: 8,
      })
    : [];

  const clauseNumber = (clause as { clauseNumber?: string; clauseCode?: string }).clauseNumber
    ?? (clause as { clauseNumber?: string; clauseCode?: string }).clauseCode
    ?? "Unknown";

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clause {clauseNumber}</p>
              <h1 className="text-xl font-semibold">{clause.title}</h1>
            </div>
            <Link className="rounded-md border px-3 py-2 text-sm" href="/clauses">
              Back to clauses
            </Link>
          </div>

          <div className="grid gap-3 rounded-md border bg-background/50 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plain English explanation</p>
              <p className="mt-1 text-sm text-foreground">
                {(clause as { plainEnglishExplanation?: string; description?: string }).plainEnglishExplanation
                  ?? (clause as { plainEnglishExplanation?: string; description?: string }).description
                  ?? "No plain-English explanation provided."}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Requirement summary</p>
              <p className="mt-1 text-sm text-foreground">{clause.requirementSummary ?? "No summary provided."}</p>
            </div>
          </div>
        </section>

        <ClauseRecordForm
          canEdit={canEdit}
          clauseId={clauseId}
          defaults={{
            status: latestRecord?.status ?? "DRAFT",
            ownerId: latestRecord?.createdByProfileId ?? "",
            targetDate: formatDateInputValue(latestRecord?.dueDate),
            reviewDate: details.reviewDate ? details.reviewDate.slice(0, 10) : "",
            processProcedures: details.processProcedures,
            processMeetsRequirement: details.processMeetsRequirement,
            evidencePaths: details.evidencePaths || latestRecord?.evidenceUrl || "",
            gapActionNeeded: details.gapActionNeeded,
            linkedSiteIds: latestRecord?.sites.map((linkedSite) => linkedSite.siteId) ?? [],
          }}
          owners={profiles.map((profile) => ({
            id: profile.id,
            label: profile.fullName ?? profile.email ?? "Unknown owner",
          }))}
          sites={sites.map((site) => ({ id: site.id, label: site.name }))}
        />

        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
          <h2 className="text-lg font-semibold">Related items</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <ComplianceComments
              canEdit={canComment}
              clauseId={clauseId}
              comments={
                latestRecord?.comments.map((comment) => ({
                  id: comment.id,
                  body: comment.body,
                  createdAt: comment.createdAt,
                  updatedAt: comment.updatedAt,
                  authorName: resolveCommentAuthorName(comment.author),
                })) ?? []
              }
              complianceRecordId={latestRecord?.id ?? null}
            />

            <article className="rounded-md border bg-background/50 p-4">
              <h3 className="text-sm font-semibold">Linked actions</h3>
              <ul className="mt-3 space-y-3 text-sm">
                {(latestRecord?.actions.length ?? 0) === 0 ? (
                  <li className="text-muted-foreground">No actions linked.</li>
                ) : (
                  latestRecord?.actions.map((action) => (
                    <li className="space-y-1" key={action.id}>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.status} · Due {formatDate(action.dueDate)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </article>

            <article className="rounded-md border bg-background/50 p-4">
              <h3 className="text-sm font-semibold">Recent audit history</h3>
              <ul className="mt-3 space-y-3 text-sm">
                {auditHistory.length === 0 ? (
                  <li className="text-muted-foreground">No audit history found.</li>
                ) : (
                  auditHistory.map((item) => (
                    <li className="space-y-1" key={item.id}>
                      <p className="font-medium">{item.fieldName.replaceAll("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">Action: {item.actionType}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.oldValue ?? "—"} → {item.newValue ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.changedBy?.fullName ?? item.changedBy?.email ?? "System"} · {formatDateTime(item.changedAt)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </article>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
