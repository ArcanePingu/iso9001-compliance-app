"use server";

import { AuditActionType, ComplianceStatus, EntityType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { buildComplianceRecordFieldChanges, createAuditLogs } from "@/lib/audit";
import { validatePlainTextComment } from "@/lib/comments";
import {
  createCommentAddedNotifications,
  createComplianceRecordCreatedNotifications,
  createComplianceRecordUpdatedNotifications,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { dedupeStrings, normalizeText, parseEnumInput, parseUuidInput } from "@/lib/validation";
import { hasPermission, requireAuth } from "@/lib/auth";

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

export type CommentFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    commentBody?: string;
  };
};

export const initialCommentFormState: CommentFormState = {
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

  const clauseId = parseUuidInput(formData.get("clauseId"));
  if (!clauseId) {
    return {
      status: "error",
      message: "Clause identifier is missing.",
    };
  }

  const status = parseEnumInput(formData.get("status"), Object.values(ComplianceStatus));
  const ownerId = parseUuidInput(formData.get("ownerId"));
  const targetDate = parseDateInput(formData.get("targetDate"));
  const reviewDateRaw = parseDateInput(formData.get("reviewDate"));
  const linkedSiteIds = dedupeStrings(
    formData
      .getAll("linkedSiteIds")
      .map((value) => parseUuidInput(value))
      .filter((value): value is string => Boolean(value)),
  );
  const processProcedures = normalizeText(formData.get("processProcedures"));
  const processMeetsRequirement = normalizeText(formData.get("processMeetsRequirement"));
  const evidencePaths = normalizeText(formData.get("evidencePaths"));
  const gapActionNeeded = normalizeText(formData.get("gapActionNeeded"));

  const fieldErrors: Record<string, string> = {};

  if (!status) {
    fieldErrors.status = "Select a valid status.";
  }
  if (processProcedures.length > 4000) {
    fieldErrors.processProcedures = "Relevant processes/procedures must be 4000 characters or fewer.";
  }
  if (processMeetsRequirement.length > 4000) {
    fieldErrors.processMeetsRequirement = "This field must be 4000 characters or fewer.";
  }
  if (evidencePaths.length > 4000) {
    fieldErrors.evidencePaths = "Evidence links/paths must be 4000 characters or fewer.";
  }
  if (gapActionNeeded.length > 4000) {
    fieldErrors.gapActionNeeded = "Gap/action details must be 4000 characters or fewer.";
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
            select: {
              id: true,
              status: true,
              createdByProfileId: true,
              dueDate: true,
              evidenceUrl: true,
              details: true,
              sites: {
                select: {
                  siteId: true,
                },
              },
            },
          },
        },
      });

      if (!clause) {
        throw new Error("Clause not found.");
      }
      if (ownerId) {
        const owner = await tx.profile.findUnique({
          where: { id: ownerId },
          select: { id: true, isActive: true },
        });
        if (!owner || !owner.isActive) {
          throw new Error("Assigned owner must be an active user.");
        }
      }
      if (linkedSiteIds.length > 0) {
        const activeSiteCount = await tx.site.count({
          where: {
            id: { in: linkedSiteIds },
            isActive: true,
          },
        });
        if (activeSiteCount !== linkedSiteIds.length) {
          throw new Error("Linked sites must all be active.");
        }
      }

      const latestRecord = clause.complianceRecords[0];
      const previousDetails = parseComplianceDetails(latestRecord?.details ?? null);
      const mergedDetails = {
        ...previousDetails,
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
              status,
              createdByProfileId: ownerId || profile?.id || null,
              dueDate: targetDate,
              evidenceUrl: evidencePaths || null, // Backward-compatible mirror field.
              details: serializeComplianceDetails(mergedDetails),
              title: `Clause ${clause.clauseNumber} compliance record`,
            },
            select: { id: true },
          })
        : await tx.complianceRecord.create({
            data: {
              isoClauseId: clause.id,
              title: `Clause ${clause.clauseNumber} compliance record`,
              status,
              createdByProfileId: ownerId || profile?.id || null,
              dueDate: targetDate,
              evidenceUrl: evidencePaths || null,
              details: serializeComplianceDetails(mergedDetails),
            },
            select: { id: true },
          });

      const previousSnapshot = latestRecord
        ? {
            status: latestRecord.status,
            ownerId: latestRecord.createdByProfileId,
            targetDate: latestRecord.dueDate,
            reviewDate: previousDetails.reviewDate,
            processProcedures: previousDetails.processProcedures,
            processMeetsRequirement: previousDetails.processMeetsRequirement,
            evidenceLinks: previousDetails.evidencePaths || latestRecord.evidenceUrl || "",
            gapActionNeeded: previousDetails.gapActionNeeded,
            linkedSites: latestRecord.sites.map((site) => site.siteId),
          }
        : null;

      const nextSnapshot = {
        status,
        ownerId: ownerId || profile?.id || null,
        targetDate,
        reviewDate: mergedDetails.reviewDate,
        processProcedures: mergedDetails.processProcedures,
        processMeetsRequirement: mergedDetails.processMeetsRequirement,
        evidenceLinks: mergedDetails.evidencePaths,
        gapActionNeeded: mergedDetails.gapActionNeeded,
        linkedSites: linkedSiteIds,
      };

      await tx.complianceRecordSite.deleteMany({
        where: { complianceRecordId: record.id },
      });

      if (linkedSiteIds.length > 0) {
        await tx.complianceRecordSite.createMany({
          data: linkedSiteIds.map((siteId) => ({ complianceRecordId: record.id, siteId })),
        });
      }

      const fieldChanges = buildComplianceRecordFieldChanges(previousSnapshot, nextSnapshot);
      await createAuditLogs(tx, {
        entityType: EntityType.COMPLIANCE_RECORD,
        entityId: record.id,
        actionType: latestRecord ? AuditActionType.UPDATE : AuditActionType.CREATE,
        changedByProfileId: profile?.id ?? null,
        changes: fieldChanges,
      });

      const recipients = [ownerId || profile?.id || ""].filter(Boolean);
      if (latestRecord) {
        await createComplianceRecordUpdatedNotifications(tx, {
          recipientUserIds: recipients,
          relatedEntityId: record.id,
          title: "Compliance record updated",
          message: `Compliance record for clause ${clause.clauseNumber} was updated.`,
        });
      } else {
        await createComplianceRecordCreatedNotifications(tx, {
          recipientUserIds: recipients,
          relatedEntityId: record.id,
          title: "Compliance record created",
          message: `Compliance record for clause ${clause.clauseNumber} was created.`,
        });
      }

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

export async function addComplianceRecordCommentAction(
  _previousState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const { profile, role } = await requireAuth({ permission: "read_compliance" });

  if (!role || !hasPermission(role, "edit_comments")) {
    return {
      status: "error",
      message: "You have read-only access and cannot add comments.",
    };
  }

  const clauseId = parseUuidInput(formData.get("clauseId"));
  const complianceRecordId = parseUuidInput(formData.get("complianceRecordId"));
  const commentBody = normalizeText(formData.get("commentBody"));

  if (!clauseId || !complianceRecordId) {
    return {
      status: "error",
      message: "The page is missing a required record identifier. Refresh and try again.",
    };
  }

  const commentError = validatePlainTextComment(commentBody);
  if (commentError) {
    return {
      status: "error",
      message: "Please resolve the validation errors and try again.",
      fieldErrors: {
        commentBody: commentError,
      },
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const recordExists = await tx.complianceRecord.findFirst({
        where: {
          id: complianceRecordId,
          isoClauseId: clauseId,
        },
        select: { id: true },
      });
      if (!recordExists) {
        throw new Error("The selected compliance record is invalid for this clause.");
      }

      const comment = await tx.comment.create({
        data: {
          complianceRecordId,
          authorProfileId: profile?.id ?? null,
          body: commentBody,
        },
      });

      const recipients = (
        await tx.complianceRecord.findUnique({
          where: { id: complianceRecordId },
          select: {
            createdByProfileId: true,
            comments: {
              select: { authorProfileId: true },
            },
          },
        })
      );

      const recipientUserIds = dedupeStrings([
        recipients?.createdByProfileId ?? null,
        ...(recipients?.comments.map((entry) => entry.authorProfileId ?? null) ?? []),
      ]
        .filter((id): id is string => Boolean(id))
        .filter((id) => id !== (profile?.id ?? "")));

      await createCommentAddedNotifications(tx, {
        recipientUserIds,
        relatedEntityId: comment.id,
        title: "Comment added",
        message: "A new comment was added to a compliance record you're following.",
      });
    });

    revalidatePath(`/clauses/${clauseId}`);

    return {
      status: "success",
      message: "Comment added.",
    };
  } catch (error) {
    const message = error instanceof Prisma.PrismaClientKnownRequestError
      ? "Could not save your comment due to a database constraint."
      : "An unexpected error occurred while adding your comment. Please try again.";

    return {
      status: "error",
      message,
    };
  }
}
