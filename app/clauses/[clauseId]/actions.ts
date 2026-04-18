"use server";

import { ComplianceStatus, EntityType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { hasPermission, requireAuth } from "@/src/lib/auth";

type ComplianceDetailsPayload = {
  reviewDate: string | null;
  processProcedures: string;
  processMeetsRequirement: string;
  evidencePaths: string;
  gapActionNeeded: string;
};

export type ClauseRecordFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialClauseRecordFormState: ClauseRecordFormState = {
  status: "idle",
};

function parseComplianceDetails(raw: string | null): ComplianceDetailsPayload {
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
    const parsed = JSON.parse(raw) as Partial<ComplianceDetailsPayload>;

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

function serializeComplianceDetails(payload: ComplianceDetailsPayload) {
  return JSON.stringify(payload);
}

function parseDateInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function ensureClauseComplianceRecord(clauseId: string, profileId?: string | null) {
  const clause = await prisma.isoClause.findUnique({
    where: { id: clauseId },
    select: {
      id: true,
      title: true,
      clauseNumber: true,
      complianceRecords: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!clause) {
    return null;
  }

  const existing = clause.complianceRecords[0];
  if (existing) {
    return existing.id;
  }

  const created = await prisma.complianceRecord.create({
    data: {
      isoClauseId: clause.id,
      title: `Clause ${clause.clauseNumber} compliance record`,
      details: serializeComplianceDetails(parseComplianceDetails(null)),
      createdByProfileId: profileId ?? null,
      status: ComplianceStatus.DRAFT,
    },
    select: { id: true },
  });

  return created.id;
}

export async function ensureClauseRecordForPage(clauseId: string) {
  const { profile } = await requireAuth({ permission: "read_compliance" });
  return ensureClauseComplianceRecord(clauseId, profile?.id);
}

export async function saveClauseRecordAction(
  _previousState: ClauseRecordFormState,
  formData: FormData,
): Promise<ClauseRecordFormState> {
  const { profile, role } = await requireAuth({ permission: "read_compliance" });

  if (!role || !hasPermission(role, "edit_compliance")) {
    return {
      status: "error",
      message: "You have read-only access and cannot edit this compliance record.",
    };
  }

  const clauseId = String(formData.get("clauseId") ?? "").trim();
  if (!clauseId) {
    return {
      status: "error",
      message: "Clause identifier is missing.",
    };
  }

  const status = String(formData.get("status") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim();
  const targetDate = parseDateInput(formData.get("targetDate"));
  const reviewDateRaw = parseDateInput(formData.get("reviewDate"));
  const linkedSiteIds = formData.getAll("linkedSiteIds").map((value) => String(value));
  const processProcedures = String(formData.get("processProcedures") ?? "").trim();
  const processMeetsRequirement = String(formData.get("processMeetsRequirement") ?? "").trim();
  const evidencePaths = String(formData.get("evidencePaths") ?? "").trim();
  const gapActionNeeded = String(formData.get("gapActionNeeded") ?? "").trim();

  const fieldErrors: Record<string, string> = {};

  if (!(Object.values(ComplianceStatus) as string[]).includes(status)) {
    fieldErrors.status = "Select a valid status.";
  }

  if (!processProcedures) {
    fieldErrors.processProcedures = "Relevant processes/procedures are required.";
  }

  if (!processMeetsRequirement) {
    fieldErrors.processMeetsRequirement = "Describe how the process meets the requirement.";
  }

  if (targetDate && reviewDateRaw && reviewDateRaw < targetDate) {
    fieldErrors.reviewDate = "Review date must be the same as or after the target date.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please resolve the validation errors and try again.",
      fieldErrors,
    };
  }

  try {
    const savedRecord = await prisma.$transaction(async (tx) => {
      const clause = await tx.isoClause.findUnique({
        where: { id: clauseId },
        select: {
          id: true,
          clauseNumber: true,
          title: true,
          complianceRecords: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { id: true, details: true },
          },
        },
      });

      if (!clause) {
        throw new Error("Clause not found.");
      }

      const latestRecord = clause.complianceRecords[0];
      const mergedDetails = {
        ...parseComplianceDetails(latestRecord?.details ?? null),
        reviewDate: reviewDateRaw ? reviewDateRaw.toISOString() : null,
        processProcedures,
        processMeetsRequirement,
        evidencePaths,
        gapActionNeeded,
      } satisfies ComplianceDetailsPayload;

      const record = latestRecord
        ? await tx.complianceRecord.update({
            where: { id: latestRecord.id },
            data: {
              status: status as ComplianceStatus,
              createdByProfileId: ownerId || profile?.id || null,
              dueDate: targetDate,
              evidenceUrl: evidencePaths || null,
              details: serializeComplianceDetails(mergedDetails),
              title: `Clause ${clause.clauseNumber} compliance record`,
            },
            select: { id: true },
          })
        : await tx.complianceRecord.create({
            data: {
              isoClauseId: clause.id,
              title: `Clause ${clause.clauseNumber} compliance record`,
              status: status as ComplianceStatus,
              createdByProfileId: ownerId || profile?.id || null,
              dueDate: targetDate,
              evidenceUrl: evidencePaths || null,
              details: serializeComplianceDetails(mergedDetails),
            },
            select: { id: true },
          });

      await tx.complianceRecordSite.deleteMany({
        where: { complianceRecordId: record.id },
      });

      if (linkedSiteIds.length > 0) {
        await tx.complianceRecordSite.createMany({
          data: linkedSiteIds.map((siteId) => ({ complianceRecordId: record.id, siteId })),
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: EntityType.COMPLIANCE_RECORD,
          entityId: record.id,
          fieldChanged: "compliance_record_saved",
          oldValue: null,
          newValue: JSON.stringify({ status, targetDate: targetDate?.toISOString() ?? null }),
          changedByProfileId: profile?.id ?? null,
        },
      });

      return record;
    });

    revalidatePath(`/clauses/${clauseId}`);

    return {
      status: "success",
      message: `Compliance record ${savedRecord.id.slice(0, 8)} saved successfully.`,
    };
  } catch (error) {
    const message = error instanceof Prisma.PrismaClientKnownRequestError
      ? "Could not save changes due to a database constraint."
      : "An unexpected error occurred while saving. Please try again.";

    return {
      status: "error",
      message,
    };
  }
}
