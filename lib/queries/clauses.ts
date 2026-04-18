import { ComplianceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { ClauseListFilters, ClauseListItem, ClauseListResult } from "@/types/clauses";

const OPEN_ACTION_STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED"] as const;

function normalizeQuery(filters: ClauseListFilters) {
  return (filters.query ?? "").trim();
}

function toClauseWhereInput(filters: ClauseListFilters): Prisma.IsoClauseWhereInput {
  const query = normalizeQuery(filters);
  const and: Prisma.IsoClauseWhereInput[] = [{ isActive: true }];

  if (query.length > 0) {
    and.push({
      OR: [
        { clauseNumber: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { plainEnglishExplanation: { contains: query, mode: "insensitive" } },
        { requirementSummary: { contains: query, mode: "insensitive" } },
        {
          complianceRecords: {
            some: {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { details: { contains: query, mode: "insensitive" } },
                { evidenceUrl: { contains: query, mode: "insensitive" } },
                {
                  createdBy: {
                    OR: [
                      { fullName: { contains: query, mode: "insensitive" } },
                      { email: { contains: query, mode: "insensitive" } },
                    ],
                  },
                },
                {
                  sites: {
                    some: {
                      site: {
                        OR: [
                          { name: { contains: query, mode: "insensitive" } },
                          { code: { contains: query, mode: "insensitive" } },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.status && filters.status !== "ALL") {
    and.push({
      complianceRecords: {
        some: {
          status: filters.status,
        },
      },
    });
  }

  if (filters.siteId && filters.siteId !== "ALL") {
    and.push({
      complianceRecords: {
        some: {
          sites: {
            some: {
              siteId: filters.siteId,
            },
          },
        },
      },
    });
  }

  if (filters.ownerId && filters.ownerId !== "ALL") {
    and.push({
      complianceRecords: {
        some: {
          createdByProfileId: filters.ownerId,
        },
      },
    });
  }

  return and.length === 1 ? and[0] : { AND: and };
}

type ClauseWithRecords = Prisma.IsoClauseGetPayload<{
  include: {
    complianceRecords: {
      include: {
        createdBy: {
          select: {
            id: true;
            fullName: true;
            email: true;
          };
        };
        sites: {
          include: {
            site: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
        actions: {
          select: {
            status: true;
          };
        };
      };
    };
  };
}>;

function mapClauseToListItem(clause: ClauseWithRecords): ClauseListItem {
  const latestRecord = clause.complianceRecords[0];

  const uniqueSites = new Map<string, string>();
  let openActionsCount = 0;

  for (const record of clause.complianceRecords) {
    for (const linkedSite of record.sites) {
      uniqueSites.set(linkedSite.site.id, linkedSite.site.name);
    }

    for (const action of record.actions) {
      if (OPEN_ACTION_STATUSES.includes(action.status)) {
        openActionsCount += 1;
      }
    }
  }

  return {
    id: clause.id,
    clauseNumber: clause.clauseNumber,
    title: clause.title,
    status: latestRecord?.status ?? "NO_RECORD",
    ownerName: latestRecord?.createdBy?.fullName ?? latestRecord?.createdBy?.email ?? "Unassigned",
    reviewDate: latestRecord?.dueDate ?? null,
    linkedSiteNames: Array.from(uniqueSites.values()),
    openActionsCount,
  };
}

export async function getClauseListData(filters: ClauseListFilters): Promise<ClauseListResult> {
  const where = toClauseWhereInput(filters);

  const [clauses, sites, owners] = await Promise.all([
    prisma.isoClause.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { clauseNumber: "asc" }],
      include: {
        complianceRecords: {
          orderBy: {
            updatedAt: "desc",
          },
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            sites: {
              include: {
                site: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            actions: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.site.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.profile.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
  ]);

  return {
    clauses: clauses.map(mapClauseToListItem),
    options: {
      statuses: Object.values(ComplianceStatus),
      sites,
      owners: owners.map((owner) => ({
        id: owner.id,
        name: owner.fullName ?? owner.email ?? "Unknown owner",
      })),
    },
  };
}
