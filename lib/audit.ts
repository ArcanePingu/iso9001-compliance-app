import { AuditActionType, EntityType, type ComplianceStatus, type Prisma } from "@prisma/client";

type ComparableComplianceSnapshot = {
  status: ComplianceStatus;
  ownerId: string | null;
  targetDate: Date | null;
  reviewDate: string | null;
  processProcedures: string;
  processMeetsRequirement: string;
  evidenceLinks: string;
  gapActionNeeded: string;
  linkedSites: string[];
};

type AuditFieldChange = {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
};

type CreateAuditLogsInput = {
  entityType: EntityType;
  entityId: string;
  actionType: AuditActionType;
  changedByProfileId?: string | null;
  changes: AuditFieldChange[];
};

const IMPORTANT_FIELD_LABELS: Record<keyof ComparableComplianceSnapshot, string> = {
  status: "status",
  ownerId: "owner",
  targetDate: "target_date",
  reviewDate: "review_date",
  processProcedures: "relevant_processes",
  processMeetsRequirement: "how_process_meets_requirement",
  evidenceLinks: "evidence_links",
  gapActionNeeded: "gap_action_needed",
  linkedSites: "linked_sites",
};

function normalizeString(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeLinkedSites(siteIds: string[] | null | undefined) {
  if (!siteIds || siteIds.length === 0) {
    return null;
  }

  const sorted = [...new Set(siteIds)].sort();
  return sorted.join(",");
}

function getComparableValue(
  key: keyof ComparableComplianceSnapshot,
  snapshot: ComparableComplianceSnapshot,
): string | null {
  switch (key) {
    case "status":
      return normalizeString(snapshot.status);
    case "ownerId":
      return normalizeString(snapshot.ownerId);
    case "targetDate":
      return normalizeDate(snapshot.targetDate);
    case "reviewDate":
      return normalizeString(snapshot.reviewDate);
    case "processProcedures":
      return normalizeString(snapshot.processProcedures);
    case "processMeetsRequirement":
      return normalizeString(snapshot.processMeetsRequirement);
    case "evidenceLinks":
      return normalizeString(snapshot.evidenceLinks);
    case "gapActionNeeded":
      return normalizeString(snapshot.gapActionNeeded);
    case "linkedSites":
      return normalizeLinkedSites(snapshot.linkedSites);
    default:
      return null;
  }
}

export function buildComplianceRecordFieldChanges(
  previousSnapshot: ComparableComplianceSnapshot | null,
  nextSnapshot: ComparableComplianceSnapshot,
): AuditFieldChange[] {
  const keys = Object.keys(IMPORTANT_FIELD_LABELS) as Array<keyof ComparableComplianceSnapshot>;

  return keys.flatMap((key) => {
    const oldValue = previousSnapshot ? getComparableValue(key, previousSnapshot) : null;
    const newValue = getComparableValue(key, nextSnapshot);

    if (oldValue === newValue) {
      return [];
    }

    return [{
      fieldName: IMPORTANT_FIELD_LABELS[key],
      oldValue,
      newValue,
    }];
  });
}

export async function createAuditLogs(
  tx: Prisma.TransactionClient,
  input: CreateAuditLogsInput,
) {
  if (input.changes.length === 0) {
    return;
  }

  await tx.auditLog.createMany({
    data: input.changes.map((change) => ({
      entityType: input.entityType,
      entityId: input.entityId,
      actionType: input.actionType,
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changedByProfileId: input.changedByProfileId ?? null,
    })),
  });
}
