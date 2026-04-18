export const COMMENT_BODY_MAX_LENGTH = 2000;

export function validatePlainTextComment(commentBody: string): string | null {
  if (!commentBody) {
    return "Comment text is required.";
  }

  if (commentBody.length > COMMENT_BODY_MAX_LENGTH) {
    return `Comment text must be ${COMMENT_BODY_MAX_LENGTH} characters or less.`;
  }

  return null;
}

export function resolveCommentAuthorName(author?: { fullName?: string | null; email?: string | null } | null): string {
  return author?.fullName ?? author?.email ?? "Unknown";
}
