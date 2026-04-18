import { hasPermission, requireAuth } from "@/lib/auth";

export default async function CommentsPage() {
  const { role } = await requireAuth({ permission: "read_compliance" });
  const canEdit = hasPermission(role!, "edit_comments");

  return (
    <main>
      <h1>Comments</h1>
      <button disabled={!canEdit}>{canEdit ? "Add / Edit Comment" : "Read-only (viewer)"}</button>
    </main>
  );
}
