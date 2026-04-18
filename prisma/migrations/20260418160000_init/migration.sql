-- Enable UUID generation for id defaults.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums.
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'STAFF', 'VIEWER');
CREATE TYPE "ComplianceStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLIANT', 'NON_COMPLIANT', 'OBSERVATION', 'CLOSED');
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');
CREATE TYPE "EntityType" AS ENUM ('ROLE', 'PROFILE', 'SITE', 'ISO_CLAUSE', 'COMPLIANCE_RECORD', 'COMMENT', 'ACTION', 'NOTIFICATION');

-- Create tables.
CREATE TABLE "Role" (
  "id" SERIAL NOT NULL,
  "code" "RoleCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "authUserId" UUID NOT NULL,
  "email" TEXT,
  "fullName" TEXT,
  "roleId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Site" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IsoClause" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clauseCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IsoClause_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "isoClauseId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "status" "ComplianceStatus" NOT NULL DEFAULT 'DRAFT',
  "evidenceUrl" TEXT,
  "dueDate" TIMESTAMP(3),
  "createdByProfileId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceRecordSite" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "complianceRecordId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceRecordSite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "complianceRecordId" UUID NOT NULL,
  "authorProfileId" UUID,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Action" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "complianceRecordId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
  "dueDate" TIMESTAMP(3),
  "createdByProfileId" UUID,
  "assignedToProfileId" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActionSite" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actionId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionSite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recipientProfileId" UUID,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" "EntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entityType" "EntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "fieldChanged" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "changedByProfileId" UUID,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Unique constraints.
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "Profile_authUserId_key" ON "Profile"("authUserId");
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");
CREATE UNIQUE INDEX "IsoClause_clauseCode_key" ON "IsoClause"("clauseCode");
CREATE UNIQUE INDEX "ComplianceRecordSite_complianceRecordId_siteId_key" ON "ComplianceRecordSite"("complianceRecordId", "siteId");
CREATE UNIQUE INDEX "ActionSite_actionId_siteId_key" ON "ActionSite"("actionId", "siteId");

-- Standard indexes.
CREATE INDEX "Profile_roleId_idx" ON "Profile"("roleId");
CREATE INDEX "Site_name_idx" ON "Site"("name");
CREATE INDEX "IsoClause_sortOrder_idx" ON "IsoClause"("sortOrder");
CREATE INDEX "ComplianceRecord_isoClauseId_idx" ON "ComplianceRecord"("isoClauseId");
CREATE INDEX "ComplianceRecord_status_idx" ON "ComplianceRecord"("status");
CREATE INDEX "ComplianceRecord_createdByProfileId_idx" ON "ComplianceRecord"("createdByProfileId");
CREATE INDEX "ComplianceRecord_dueDate_idx" ON "ComplianceRecord"("dueDate");
CREATE INDEX "ComplianceRecordSite_siteId_idx" ON "ComplianceRecordSite"("siteId");
CREATE INDEX "Comment_complianceRecordId_createdAt_idx" ON "Comment"("complianceRecordId", "createdAt");
CREATE INDEX "Comment_authorProfileId_idx" ON "Comment"("authorProfileId");
CREATE INDEX "Action_complianceRecordId_idx" ON "Action"("complianceRecordId");
CREATE INDEX "Action_status_idx" ON "Action"("status");
CREATE INDEX "Action_dueDate_idx" ON "Action"("dueDate");
CREATE INDEX "Action_createdByProfileId_idx" ON "Action"("createdByProfileId");
CREATE INDEX "Action_assignedToProfileId_idx" ON "Action"("assignedToProfileId");
CREATE INDEX "ActionSite_siteId_idx" ON "ActionSite"("siteId");
CREATE INDEX "Notification_recipientProfileId_readAt_idx" ON "Notification"("recipientProfileId", "readAt");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_changedByProfileId_idx" ON "AuditLog"("changedByProfileId");
CREATE INDEX "AuditLog_changedAt_idx" ON "AuditLog"("changedAt");

-- Foreign keys.
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceRecord"
  ADD CONSTRAINT "ComplianceRecord_isoClauseId_fkey"
  FOREIGN KEY ("isoClauseId") REFERENCES "IsoClause"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceRecord"
  ADD CONSTRAINT "ComplianceRecord_createdByProfileId_fkey"
  FOREIGN KEY ("createdByProfileId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceRecordSite"
  ADD CONSTRAINT "ComplianceRecordSite_complianceRecordId_fkey"
  FOREIGN KEY ("complianceRecordId") REFERENCES "ComplianceRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceRecordSite"
  ADD CONSTRAINT "ComplianceRecordSite_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_complianceRecordId_fkey"
  FOREIGN KEY ("complianceRecordId") REFERENCES "ComplianceRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_authorProfileId_fkey"
  FOREIGN KEY ("authorProfileId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Action"
  ADD CONSTRAINT "Action_complianceRecordId_fkey"
  FOREIGN KEY ("complianceRecordId") REFERENCES "ComplianceRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Action"
  ADD CONSTRAINT "Action_createdByProfileId_fkey"
  FOREIGN KEY ("createdByProfileId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Action"
  ADD CONSTRAINT "Action_assignedToProfileId_fkey"
  FOREIGN KEY ("assignedToProfileId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActionSite"
  ADD CONSTRAINT "ActionSite_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "Action"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActionSite"
  ADD CONSTRAINT "ActionSite_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_recipientProfileId_fkey"
  FOREIGN KEY ("recipientProfileId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_changedByProfileId_fkey"
  FOREIGN KEY ("changedByProfileId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
