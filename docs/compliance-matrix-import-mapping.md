# Compliance matrix spreadsheet import mapping

This project separates **reference ISO clause metadata** from **business-specific compliance responses**:

- `IsoClause` stores canonical clause identity and explanatory text.
- `ComplianceRecord` stores organization-specific implementation status and evidence.

## Proposed mapping (implemented)

| Spreadsheet column | Target model.field | Notes |
|---|---|---|
| ISO Clause | `IsoClause.clauseNumber` | Required. Stable key used for upsert; prevents duplicate clauses. |
| Clause Title | `IsoClause.title` | Required for clause create/update. |
| Plain English Explanation | `IsoClause.plainEnglishExplanation` | Optional metadata text. |
| Requirement Summary | `IsoClause.requirementSummary` | Optional metadata text. |
| Relevant Process(es) | `ComplianceRecord.details` | Included as labeled line in details block. |
| How Process Meets Requirement | `ComplianceRecord.details` | Included as labeled line in details block. |
| Gap / Action Needed | `ComplianceRecord.details` | Included as labeled line in details block. |
| Owner | `ComplianceRecord.details` | Included as `Owner (unlinked)` because there is no direct owner field on `ComplianceRecord`. |
| Evidence / Records | `ComplianceRecord.evidenceUrl` when URL, otherwise `ComplianceRecord.details` | Non-URL evidence is retained in details and logged as warning. |
| Status | `ComplianceRecord.status` | Mapped to enum (`DRAFT`, `IN_PROGRESS`, `COMPLIANT`, `NON_COMPLIANT`, `OBSERVATION`, `CLOSED`); unknown values default to `DRAFT` with warning. |
| Target Date | `ComplianceRecord.dueDate` | Parsed as date; invalid values are ignored with warning. |

## Import behavior

- Script supports `.json` (array of row objects) and `.csv` (header row required).
- Clauses are upserted by `clauseNumber` and therefore not duplicated.
- Compliance records are only created/updated if a row has business response data (`Relevant Process(es)`, `How Process Meets Requirement`, `Evidence / Records`, `Status`, `Gap / Action Needed`, `Owner`, `Target Date`).
- Compliance records are upsert-like by deterministic title format `Clause <ISO Clause> - <Clause Title>` scoped to the clause.
- Import issues are logged with row number and severity (`warn` / `error`) for traceability.
