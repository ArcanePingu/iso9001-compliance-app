-- Add action type for richer audit events.
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- Keep existing data while renaming the field column.
ALTER TABLE "AuditLog" RENAME COLUMN "fieldChanged" TO "fieldName";

-- Add actionType with UPDATE default so historical rows remain valid.
ALTER TABLE "AuditLog"
  ADD COLUMN "actionType" "AuditActionType" NOT NULL DEFAULT 'UPDATE';
