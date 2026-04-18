import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type IsoClauseImportRow = {
  clauseNumber: string;
  title: string;
  plainEnglishExplanation?: string | null;
  requirementSummary?: string | null;
  parentClauseNumber?: string | null;
  sortOrder?: number | null;
};

function normalizeClauseNumber(value: string): string {
  return value.trim();
}

function ensureUniqueClauseNumbers(rows: IsoClauseImportRow[]): void {
  const seen = new Set<string>();

  for (const row of rows) {
    const clauseNumber = normalizeClauseNumber(row.clauseNumber);

    if (seen.has(clauseNumber)) {
      throw new Error(`Duplicate clauseNumber found in import file: ${clauseNumber}`);
    }

    seen.add(clauseNumber);
  }
}

function ensureParentReferencesExist(rows: IsoClauseImportRow[]): void {
  const clauseNumbers = new Set(rows.map((row) => normalizeClauseNumber(row.clauseNumber)));

  for (const row of rows) {
    const parentClauseNumber = row.parentClauseNumber?.trim();

    if (!parentClauseNumber) {
      continue;
    }

    if (!clauseNumbers.has(parentClauseNumber)) {
      throw new Error(
        `Clause ${row.clauseNumber} references parent ${parentClauseNumber}, but the parent does not exist in this dataset.`
      );
    }
  }
}

export async function importIsoClauses(prisma: PrismaClient, inputFilePath: string): Promise<number> {
  const absolutePath = path.resolve(process.cwd(), inputFilePath);
  const raw = await readFile(absolutePath, 'utf8');
  const rows = JSON.parse(raw) as IsoClauseImportRow[];

  if (!Array.isArray(rows)) {
    throw new Error('ISO clause import file must contain a JSON array.');
  }

  ensureUniqueClauseNumbers(rows);
  ensureParentReferencesExist(rows);

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const clauseNumber = normalizeClauseNumber(row.clauseNumber);

      await tx.isoClause.upsert({
        where: { clauseNumber },
        create: {
          clauseNumber,
          title: row.title.trim(),
          plainEnglishExplanation: row.plainEnglishExplanation?.trim() || null,
          requirementSummary: row.requirementSummary?.trim() || null,
          sortOrder: row.sortOrder ?? null,
          isActive: true
        },
        update: {
          title: row.title.trim(),
          plainEnglishExplanation: row.plainEnglishExplanation?.trim() || null,
          requirementSummary: row.requirementSummary?.trim() || null,
          sortOrder: row.sortOrder ?? null,
          isActive: true
        }
      });
    }

    const clauses = await tx.isoClause.findMany({
      where: {
        clauseNumber: {
          in: rows.map((row) => normalizeClauseNumber(row.clauseNumber))
        }
      },
      select: {
        id: true,
        clauseNumber: true
      }
    });

    const idByClauseNumber = new Map(clauses.map((clause) => [clause.clauseNumber, clause.id]));

    for (const row of rows) {
      const clauseNumber = normalizeClauseNumber(row.clauseNumber);
      const parentClauseNumber = row.parentClauseNumber?.trim() || null;

      await tx.isoClause.update({
        where: { clauseNumber },
        data: {
          parentClauseId: parentClauseNumber ? (idByClauseNumber.get(parentClauseNumber) ?? null) : null
        }
      });
    }
  });

  return rows.length;
}

async function runFromCli() {
  const inputFilePath = process.argv[2] || 'prisma/seed/iso-clauses.json';
  const prisma = new PrismaClient();

  try {
    const importedCount = await importIsoClauses(prisma, inputFilePath);
    console.log(`Imported ${importedCount} ISO clauses from ${inputFilePath}.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFromCli().catch((error) => {
    console.error('ISO clause import failed', error);
    process.exit(1);
  });
}
