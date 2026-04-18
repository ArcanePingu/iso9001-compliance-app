-- Reshape ISO clause reference table to support canonical clause library imports.
ALTER TABLE "IsoClause"
  RENAME COLUMN "clauseCode" TO "clauseNumber";

ALTER TABLE "IsoClause"
  DROP COLUMN "description",
  ADD COLUMN "plainEnglishExplanation" TEXT,
  ADD COLUMN "requirementSummary" TEXT,
  ADD COLUMN "parentClauseId" UUID;

DROP INDEX IF EXISTS "IsoClause_clauseCode_key";
CREATE UNIQUE INDEX "IsoClause_clauseNumber_key" ON "IsoClause"("clauseNumber");

CREATE INDEX "IsoClause_parentClauseId_idx" ON "IsoClause"("parentClauseId");

ALTER TABLE "IsoClause"
  ADD CONSTRAINT "IsoClause_parentClauseId_fkey"
  FOREIGN KEY ("parentClauseId") REFERENCES "IsoClause"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
