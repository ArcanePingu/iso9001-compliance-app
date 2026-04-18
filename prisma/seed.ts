import { PrismaClient, RoleCode } from '@prisma/client';
import isoClauses from './seed/iso-clauses.json';

const prisma = new PrismaClient();

async function main() {
  const roles: Array<{ code: RoleCode; name: string; description: string }> = [
    {
      code: RoleCode.ADMIN,
      name: 'Admin',
      description: 'Full administrative access across compliance records and settings.'
    },
    {
      code: RoleCode.STAFF,
      name: 'Staff',
      description: 'Can create and maintain compliance records, comments, and actions.'
    },
    {
      code: RoleCode.VIEWER,
      name: 'Viewer',
      description: 'Read-only access to records and reports.'
    }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description
      },
      create: role
    });
  }

  for (const clause of isoClauses) {
    await prisma.isoClause.upsert({
      where: { clauseCode: clause.clauseCode },
      update: {
        title: clause.title,
        description: clause.description,
        sortOrder: clause.sortOrder,
        isActive: true
      },
      create: {
        clauseCode: clause.clauseCode,
        title: clause.title,
        description: clause.description,
        sortOrder: clause.sortOrder,
        isActive: true
      }
    });
  }

  console.log(`Seeded ${roles.length} roles and ${isoClauses.length} ISO clauses.`);
}

main()
  .catch((error) => {
    console.error('Prisma seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
