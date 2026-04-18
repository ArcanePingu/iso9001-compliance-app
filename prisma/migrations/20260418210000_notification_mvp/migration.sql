-- Add notification trigger type enum.
CREATE TYPE "NotificationType" AS ENUM (
  'COMPLIANCE_RECORD_CREATED',
  'COMPLIANCE_RECORD_UPDATED',
  'COMMENT_ADDED',
  'ACTION_ASSIGNED',
  'ACTION_OVERDUE',
  'REVIEW_DATE_DUE_SOON'
);

-- Add required notification fields.
ALTER TABLE "Notification"
  ADD COLUMN "type" "NotificationType" NOT NULL DEFAULT 'COMPLIANCE_RECORD_UPDATED',
  ADD COLUMN "relatedEntityType" "EntityType",
  ADD COLUMN "relatedEntityId" TEXT,
  ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false;

-- Backfill relation fields from existing columns.
UPDATE "Notification"
SET
  "relatedEntityType" = "entityType",
  "relatedEntityId" = "entityId";

ALTER TABLE "Notification"
  ALTER COLUMN "relatedEntityType" SET NOT NULL,
  ALTER COLUMN "relatedEntityId" SET NOT NULL;

-- Remove deprecated columns.
ALTER TABLE "Notification"
  DROP COLUMN "entityType",
  DROP COLUMN "entityId",
  DROP COLUMN "readAt";

-- Replace indexes.
DROP INDEX IF EXISTS "Notification_recipientProfileId_readAt_idx";
DROP INDEX IF EXISTS "Notification_entityType_entityId_idx";

CREATE INDEX "Notification_recipientProfileId_isRead_idx" ON "Notification"("recipientProfileId", "isRead");
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");
