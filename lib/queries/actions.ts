import { ActionStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { ActionListFilters, ActionListItem, ActionListResult } from "@/types/actions";

function normalizeQuery(filters: ActionListFilters) {
  return (filters.query ?? "").trim();
}

function toActionWhereInput(filters: ActionListFilters): Prisma.ActionWhereInput {
  const query = normalizeQuery(filters);
  const and: Prisma.ActionWhereInput[] = [];

  if (query.length > 0) {
    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        {
          complianceRecord: {
            isoClause: {
              OR: [
                { clauseNumber: { contains: query, mode: "insensitive" } },
                { title: { contains: query, mode: "insensitive" } },
                { requirementSummary: { contains: query, mode: "insensitive" } },
              ],
            },
          },
        },
        {
          complianceRecord: {
            OR: [
              { details: { contains: query, mode: "insensitive" } },
              { evidenceUrl: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        {
          complianceRecord: {
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
        },
        {
          OR: [
            { assignedTo: { fullName: { contains: query, mode: "insensitive" } } },
            { assignedTo: { email: { contains: query, mode: "insensitive" } } },
            { createdBy: { fullName: { contains: query, mode: "insensitive" } } },
            { createdBy: { email: { contains: query, mode: "insensitive" } } },
            { complianceRecord: { createdBy: { fullName: { contains: query, mode: "insensitive" } } } },
            { complianceRecord: { createdBy: { email: { contains: query, mode: "insensitive" } } } },
          ],
        },
      ],
    });
  }

  if (filters.status && filters.status !== "ALL") {
    and.push({ status: filters.status });
  }

  if (filters.siteId && filters.siteId !== "ALL") {
    and.push({
      OR: [
        { sites: { some: { siteId: filters.siteId } } },
        { complianceRecord: { sites: { some: { siteId: filters.siteId } } } },
      ],
    });
  }

  if (filters.ownerId && filters.ownerId !== "ALL") {
    and.push({
      OR: [
        { assignedToProfileId: filters.ownerId },
        { createdByProfileId: filters.ownerId },
        { complianceRecord: { createdByProfileId: filters.ownerId } },
      ],
    });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
}

function mapActionToListItem(action: Prisma.ActionGetPayload<{
  include: {
    assignedTo: { select: { fullName: true; email: true } };
    createdBy: { select: { fullName: true; email: true } };
    complianceRecord: {
      include: {
        createdBy: { select: { fullName: true; email: true } };
        isoClause: { select: { id: true; clauseNumber: true; title: true } };
        sites: { include: { site: { select: { id: true; name: true } } } };
      };
    };
    sites: { include: { site: { select: { id: true; name: true } } } };
  };
}>): ActionListItem {
  const sites = new Map<string, string>();

  for (const linkedSite of action.complianceRecord.sites) {
    sites.set(linkedSite.site.id, linkedSite.site.name);
  }

  for (const linkedSite of action.sites) {
    sites.set(linkedSite.site.id, linkedSite.site.name);
  }

  const ownerName =
    action.assignedTo?.fullName
    ?? action.assignedTo?.email
    ?? action.createdBy?.fullName
    ?? action.createdBy?.email
    ?? action.complianceRecord.createdBy?.fullName
    ?? action.complianceRecord.createdBy?.email
    ?? "Unassigned";

  return {
    id: action.id,
    title: action.title,
    status: action.status,
    dueDate: action.dueDate,
    clauseId: action.complianceRecord.isoClause.id,
    clauseNumber: action.complianceRecord.isoClause.clauseNumber,
    clauseTitle: action.complianceRecord.isoClause.title,
    ownerName,
    siteNames: Array.from(sites.values()),
    evidencePath: action.complianceRecord.evidenceUrl,
  };
}

export async function getActionListData(filters: ActionListFilters): Promise<ActionListResult> {
  const where = toActionWhereInput(filters);

  const [actions, sites, owners] = await Promise.all([
    prisma.action.findMany({
      where,
      include: {
        assignedTo: { select: { fullName: true, email: true } },
        createdBy: { select: { fullName: true, email: true } },
        complianceRecord: {
          include: {
            createdBy: { select: { fullName: true, email: true } },
            isoClause: { select: { id: true, clauseNumber: true, title: true } },
            sites: { include: { site: { select: { id: true, name: true } } } },
          },
        },
        sites: { include: { site: { select: { id: true, name: true } } } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
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
    actions: actions.map(mapActionToListItem),
    options: {
      statuses: Object.values(ActionStatus),
      sites,
      owners: owners.map((owner) => ({
        id: owner.id,
        name: owner.fullName ?? owner.email ?? "Unknown owner",
      })),
    },
  };
}
