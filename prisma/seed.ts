import { PrismaClient, RoleCode } from '@prisma/client';
import { importIsoClauses } from './import-iso-clauses';

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

  const importedClauseCount = await importIsoClauses(prisma, 'prisma/seed/iso-clauses.json');

  console.log(`Seeded ${roles.length} roles and ${importedClauseCount} ISO clauses.`);
}

main()
  .catch((error) => {
    console.error('Prisma seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
