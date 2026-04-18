"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import {
  addComplianceRecordCommentAction,
  initialCommentFormState,
  type CommentFormState,
} from "../actions";

type ComplianceComment = {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
};

type ComplianceCommentsProps = {
  clauseId: string;
  complianceRecordId: string | null;
  canEdit: boolean;
  comments: ComplianceComment[];
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function CommentStatusMessage({ state }: { state: CommentFormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${
        state.status === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

export function ComplianceComments({ clauseId, complianceRecordId, canEdit, comments }: ComplianceCommentsProps) {
  const [state, formAction, isPending] = useActionState(addComplianceRecordCommentAction, initialCommentFormState);

  return (
    <article className="rounded-md border bg-background/50 p-4">
      <h3 className="text-sm font-semibold">Comments</h3>

      <div className="mt-3 space-y-3 text-sm">
        {comments.length === 0 ? <p className="text-muted-foreground">No comments yet.</p> : null}

        {comments.map((comment) => {
          const wasEdited = comment.updatedAt.getTime() > comment.createdAt.getTime();

          return (
            <div className="space-y-1" key={comment.id}>
              <p className="whitespace-pre-wrap break-words">{comment.body}</p>
              <p className="text-xs text-muted-foreground">
                {comment.authorName} · {formatDateTime(comment.createdAt)}
                {wasEdited ? ` · Edited ${formatDateTime(comment.updatedAt)}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      {canEdit ? (
        <form action={formAction} className="mt-4 space-y-2 border-t pt-4">
          <input name="clauseId" type="hidden" value={clauseId} />
          <input name="complianceRecordId" type="hidden" value={complianceRecordId ?? ""} />

          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="commentBody">
            Add comment
          </label>
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
            id="commentBody"
            name="commentBody"
            placeholder="Write a plain-text comment"
          />
          {state.fieldErrors?.commentBody ? (
            <p className="text-xs text-red-600">{state.fieldErrors.commentBody}</p>
          ) : null}

          <CommentStatusMessage state={state} />

          <div className="flex justify-end">
            <Button disabled={isPending || !complianceRecordId} type="submit">
              {isPending ? "Adding..." : "Add comment"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">Read-only mode. Viewers can read comments but cannot add them.</p>
      )}
    </article>
  );
}
