import { requireAuth } from "@/lib/auth";

export default async function ManageUsersPage() {
  await requireAuth({ permission: "manage_users" });

  return (
    <main>
      <h1>User Management</h1>
      <p>Admin-only page. Plug in your user invite/update flows here.</p>
    </main>
  );
}
