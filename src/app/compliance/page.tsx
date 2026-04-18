import { hasPermission, requireAuth } from "@/lib/auth";

export default async function CompliancePage() {
  const { role } = await requireAuth({ permission: "read_compliance" });
  const canEdit = hasPermission(role!, "edit_compliance");

  return (
    <main>
      <h1>Compliance Records</h1>
      <p>All roles can read records.</p>
      <button disabled={!canEdit}>{canEdit ? "Edit Record" : "Read-only (viewer)"}</button>
    </main>
  );
}
