"use client";

import { useActionState } from "react";
import type { ComplianceStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  initialClauseRecordFormState,
  saveClauseRecordAction,
} from "../actions";

type Option = { id: string; label: string };

type ClauseRecordFormProps = {
  clauseId: string;
  canEdit: boolean;
  defaults: {
    status: ComplianceStatus;
    ownerId: string;
    targetDate: string;
    reviewDate: string;
    processProcedures: string;
    processMeetsRequirement: string;
    evidencePaths: string;
    gapActionNeeded: string;
    linkedSiteIds: string[];
  };
  owners: Option[];
  sites: Option[];
};

const STATUS_OPTIONS: Array<{ value: ComplianceStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLIANT", label: "Compliant" },
  { value: "NON_COMPLIANT", label: "Non-compliant" },
  { value: "OBSERVATION", label: "Observation" },
  { value: "CLOSED", label: "Closed" },
];

export function ClauseRecordForm({ clauseId, canEdit, defaults, owners, sites }: ClauseRecordFormProps) {
  const [state, formAction, isPending] = useActionState(saveClauseRecordAction, initialClauseRecordFormState);

  return (
    <form action={formAction} className="space-y-6 rounded-lg border bg-card p-6 shadow-panel">
      <input name="clauseId" type="hidden" value={clauseId} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compliance record</h2>
        {!canEdit && (
          <span className="rounded-md border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Read-only mode
          </span>
        )}
      </div>

      {state.message && (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.status} disabled={!canEdit || isPending} name="status">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.status ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.status}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Owner</label>
          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.ownerId} disabled={!canEdit || isPending} name="ownerId">
            <option value="">Unassigned</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Target date</label>
          <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.targetDate} disabled={!canEdit || isPending} name="targetDate" type="date" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Review date</label>
          <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.reviewDate} disabled={!canEdit || isPending} name="reviewDate" type="date" />
          {state.fieldErrors?.reviewDate ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.reviewDate}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Linked sites</p>
        <div className="grid gap-2 rounded-md border bg-background/40 p-3 md:grid-cols-2">
          {sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sites available.</p>
          ) : (
            sites.map((site) => (
              <label className="flex items-center gap-2 text-sm" key={site.id}>
                <input
                  defaultChecked={defaults.linkedSiteIds.includes(site.id)}
                  disabled={!canEdit || isPending}
                  name="linkedSiteIds"
                  type="checkbox"
                  value={site.id}
                />
                {site.label}
              </label>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Relevant processes/procedures</label>
          <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.processProcedures} disabled={!canEdit || isPending} maxLength={4000} name="processProcedures" required />
          {state.fieldErrors?.processProcedures ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.processProcedures}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">How the process meets the requirement</label>
          <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.processMeetsRequirement} disabled={!canEdit || isPending} maxLength={4000} name="processMeetsRequirement" required />
          {state.fieldErrors?.processMeetsRequirement ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.processMeetsRequirement}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence links or file paths</label>
          <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.evidencePaths} disabled={!canEdit || isPending} maxLength={4000} name="evidencePaths" placeholder="One per line (URL or file path)" />
          {state.fieldErrors?.evidencePaths ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.evidencePaths}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Gap / action needed</label>
          <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={defaults.gapActionNeeded} disabled={!canEdit || isPending} maxLength={4000} name="gapActionNeeded" />
          {state.fieldErrors?.gapActionNeeded ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.gapActionNeeded}</p> : null}
        </div>
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Save compliance record"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
