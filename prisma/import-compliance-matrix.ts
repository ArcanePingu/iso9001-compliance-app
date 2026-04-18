import { ComplianceStatus, PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type MatrixImportRow = {
  'ISO Clause'?: string;
  'Clause Title'?: string;
  'Plain English Explanation'?: string;
  'Requirement Summary'?: string;
  'Relevant Process(es)'?: string;
  'How Process Meets Requirement'?: string;
  'Evidence / Records'?: string;
  Status?: string;
  'Gap / Action Needed'?: string;
  Owner?: string;
  'Target Date'?: string;
};

type ImportIssueLevel = 'warn' | 'error';

type ImportIssue = {
  level: ImportIssueLevel;
  rowNumber: number;
  message: string;
};

type ParsedDate = {
  value: Date | null;
  message?: string;
};

type ParsedStatus = {
  value: ComplianceStatus;
  message?: string;
};

type ImportSummary = {
  clausesCreated: number;
  clausesUpdated: number;
  recordsCreated: number;
  recordsUpdated: number;
  issues: ImportIssue[];
};

const STATUS_MAP: Record<string, ComplianceStatus> = {
  draft: ComplianceStatus.DRAFT,
  in_progress: ComplianceStatus.IN_PROGRESS,
  'in progress': ComplianceStatus.IN_PROGRESS,
  compliant: ComplianceStatus.COMPLIANT,
  non_compliant: ComplianceStatus.NON_COMPLIANT,
  'non-compliant': ComplianceStatus.NON_COMPLIANT,
  'non compliant': ComplianceStatus.NON_COMPLIANT,
  observation: ComplianceStatus.OBSERVATION,
  closed: ComplianceStatus.CLOSED
};

function normalizeText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeClauseNumber(value: string | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized;
}

function pushIssue(issues: ImportIssue[], level: ImportIssueLevel, rowNumber: number, message: string): void {
  issues.push({ level, rowNumber, message });
}

function parseStatus(value: string | undefined): ParsedStatus {
  const raw = normalizeText(value);

  if (!raw) {
    return { value: ComplianceStatus.DRAFT, message: 'Status not provided; defaulted to DRAFT.' };
  }

  const key = raw.toLowerCase();
  const mapped = STATUS_MAP[key];

  if (!mapped) {
    return {
      value: ComplianceStatus.DRAFT,
      message: `Unrecognized status \"${raw}\"; defaulted to DRAFT.`
    };
  }

  return { value: mapped };
}

function parseTargetDate(value: string | undefined): ParsedDate {
  const raw = normalizeText(value);

  if (!raw) {
    return { value: null };
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return {
      value: null,
      message: `Target Date \"${raw}\" is not a valid date and was ignored.`
    };
  }

  return { value: parsed };
}

function hasComplianceResponseData(row: MatrixImportRow): boolean {
  return Boolean(
    normalizeText(row['Relevant Process(es)']) ||
      normalizeText(row['How Process Meets Requirement']) ||
      normalizeText(row['Evidence / Records']) ||
      normalizeText(row.Status) ||
      normalizeText(row['Gap / Action Needed']) ||
      normalizeText(row.Owner) ||
      normalizeText(row['Target Date'])
  );
}

function buildComplianceDetails(row: MatrixImportRow): string | null {
  const detailParts: string[] = [];

  const relevantProcesses = normalizeText(row['Relevant Process(es)']);
  if (relevantProcesses) {
    detailParts.push(`Relevant Process(es): ${relevantProcesses}`);
  }

  const processExplanation = normalizeText(row['How Process Meets Requirement']);
  if (processExplanation) {
    detailParts.push(`How Process Meets Requirement: ${processExplanation}`);
  }

  const gapActionNeeded = normalizeText(row['Gap / Action Needed']);
  if (gapActionNeeded) {
    detailParts.push(`Gap / Action Needed: ${gapActionNeeded}`);
  }

  const owner = normalizeText(row.Owner);
  if (owner) {
    detailParts.push(`Owner (unlinked): ${owner}`);
  }

  return detailParts.length > 0 ? detailParts.join('\n') : null;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function parseCsv(content: string): MatrixImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: MatrixImportRow = {};

    headers.forEach((header, index) => {
      row[header as keyof MatrixImportRow] = values[index];
    });

    return row;
  });
}

async function loadRows(inputFilePath: string): Promise<MatrixImportRow[]> {
  const absolutePath = path.resolve(process.cwd(), inputFilePath);
  const raw = await readFile(absolutePath, 'utf8');

  if (inputFilePath.toLowerCase().endsWith('.csv')) {
    return parseCsv(raw);
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('Import file must be a JSON array or a CSV file with a header row.');
  }

  return parsed as MatrixImportRow[];
}

export async function importComplianceMatrix(
  prisma: PrismaClient,
  inputFilePath: string
): Promise<ImportSummary> {
  const rows = await loadRows(inputFilePath);
  const issues: ImportIssue[] = [];

  const summary: ImportSummary = {
    clausesCreated: 0,
    clausesUpdated: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    issues
  };

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const clauseNumber = normalizeClauseNumber(row['ISO Clause']);

      if (!clauseNumber) {
        pushIssue(issues, 'error', rowNumber, 'Missing ISO Clause; row skipped.');
        continue;
      }

      const clauseTitle = normalizeText(row['Clause Title']);

      if (!clauseTitle) {
        pushIssue(issues, 'error', rowNumber, `Clause ${clauseNumber} is missing Clause Title; row skipped.`);
        continue;
      }

      const existingClause = await tx.isoClause.findUnique({
        where: { clauseNumber },
        select: { id: true }
      });

      const clause = await tx.isoClause.upsert({
        where: { clauseNumber },
        create: {
          clauseNumber,
          title: clauseTitle,
          plainEnglishExplanation: normalizeText(row['Plain English Explanation']),
          requirementSummary: normalizeText(row['Requirement Summary']),
          isActive: true
        },
        update: {
          title: clauseTitle,
          plainEnglishExplanation: normalizeText(row['Plain English Explanation']),
          requirementSummary: normalizeText(row['Requirement Summary']),
          isActive: true
        },
        select: { id: true }
      });

      if (existingClause) {
        summary.clausesUpdated += 1;
      } else {
        summary.clausesCreated += 1;
      }


      if (!hasComplianceResponseData(row)) {
        continue;
      }

      const parsedStatus = parseStatus(row.Status);
      if (parsedStatus.message) {
        pushIssue(issues, 'warn', rowNumber, parsedStatus.message);
      }

      const parsedDate = parseTargetDate(row['Target Date']);
      if (parsedDate.message) {
        pushIssue(issues, 'warn', rowNumber, parsedDate.message);
      }

      const evidence = normalizeText(row['Evidence / Records']);
      const evidenceUrl = evidence && /^https?:\/\//i.test(evidence) ? evidence : null;
      if (evidence && !evidenceUrl) {
        pushIssue(
          issues,
          'warn',
          rowNumber,
          'Evidence / Records is not a URL; kept in details and left evidenceUrl empty.'
        );
      }

      const details = [buildComplianceDetails(row), evidence && !evidenceUrl ? `Evidence / Records: ${evidence}` : null]
        .filter((part): part is string => Boolean(part))
        .join('\n');

      const recordTitle = `Clause ${clauseNumber} - ${clauseTitle}`;
      const existingRecords = await tx.complianceRecord.findMany({
        where: {
          isoClauseId: clause.id,
          title: recordTitle
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' }
      });

      if (existingRecords.length > 1) {
        pushIssue(
          issues,
          'warn',
          rowNumber,
          `Found ${existingRecords.length} matching ComplianceRecord rows for clause ${clauseNumber}; updated the oldest record.`
        );
      }

      if (existingRecords.length > 0) {
        await tx.complianceRecord.update({
          where: { id: existingRecords[0].id },
          data: {
            status: parsedStatus.value,
            details: details || null,
            evidenceUrl,
            dueDate: parsedDate.value
          }
        });
        summary.recordsUpdated += 1;
      } else {
        await tx.complianceRecord.create({
          data: {
            isoClauseId: clause.id,
            title: recordTitle,
            status: parsedStatus.value,
            details: details || null,
            evidenceUrl,
            dueDate: parsedDate.value
          }
        });
        summary.recordsCreated += 1;
      }
    }
  });

  return summary;
}

function printSummary(summary: ImportSummary): void {
  console.log('Compliance matrix import complete.');
  console.log(`Clauses created: ${summary.clausesCreated}`);
  console.log(`Clauses updated: ${summary.clausesUpdated}`);
  console.log(`Compliance records created: ${summary.recordsCreated}`);
  console.log(`Compliance records updated: ${summary.recordsUpdated}`);

  if (summary.issues.length === 0) {
    console.log('No import issues found.');
    return;
  }

  console.log(`Issues (${summary.issues.length}):`);

  for (const issue of summary.issues) {
    const logLine = `[${issue.level.toUpperCase()}] row ${issue.rowNumber}: ${issue.message}`;
    if (issue.level === 'error') {
      console.error(logLine);
    } else {
      console.warn(logLine);
    }
  }
}

async function runFromCli() {
  const inputFilePath = process.argv[2];

  if (!inputFilePath) {
    throw new Error('Usage: npx tsx prisma/import-compliance-matrix.ts <path-to-json-or-csv>');
  }

  const prisma = new PrismaClient();

  try {
    const summary = await importComplianceMatrix(prisma, inputFilePath);
    printSummary(summary);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFromCli().catch((error) => {
    console.error('Compliance matrix import failed', error);
    process.exit(1);
  });
}
