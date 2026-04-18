import { prisma } from "@/lib/prisma";

export async function getAdminUsersPageData() {
  return Promise.all([
    prisma.role.findMany({
      orderBy: { id: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.profile.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      take: 300,
    }),
  ]);
}
