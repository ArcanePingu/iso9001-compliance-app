import type { ComplianceStatus } from "@prisma/client";

export type ClauseListFilters = {
  query?: string;
  status?: ComplianceStatus | "ALL";
  siteId?: string | "ALL";
  ownerId?: string | "ALL";
};

export type ClauseListItem = {
  id: string;
  clauseCode: string;
  title: string;
  status: ComplianceStatus | "NO_RECORD";
  ownerName: string;
  reviewDate: Date | null;
  linkedSiteNames: string[];
  openActionsCount: number;
};

export type ClauseFilterOptions = {
  statuses: Array<ComplianceStatus>;
  sites: Array<{ id: string; name: string; code: string }>;
  owners: Array<{ id: string; name: string }>;
};

export type ClauseListResult = {
  clauses: ClauseListItem[];
  options: ClauseFilterOptions;
};
