import type { ActionStatus } from "@prisma/client";

export type ActionListFilters = {
  query?: string;
  status?: ActionStatus | "ALL";
  siteId?: string | "ALL";
  ownerId?: string | "ALL";
};

export type ActionListItem = {
  id: string;
  title: string;
  status: ActionStatus;
  dueDate: Date | null;
  clauseId: string;
  clauseNumber: string;
  clauseTitle: string;
  ownerName: string;
  siteNames: string[];
  evidencePath: string | null;
};

export type ActionFilterOptions = {
  statuses: Array<ActionStatus>;
  sites: Array<{ id: string; name: string; code: string }>;
  owners: Array<{ id: string; name: string }>;
};

export type ActionListResult = {
  actions: ActionListItem[];
  options: ActionFilterOptions;
};
