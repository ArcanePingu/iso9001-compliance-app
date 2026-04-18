import { hasPermission, requireAuth } from "@/lib/auth";

export default async function ActionsPage() {
  const { role } = await requireAuth({ permission: "read_compliance" });
  const canEdit = hasPermission(role!, "edit_actions");

  return (
    <main>
      <h1>Corrective / Preventive Actions</h1>
      <button disabled={!canEdit}>{canEdit ? "Edit Action" : "Read-only (viewer)"}</button>
    </main>
  );
}
