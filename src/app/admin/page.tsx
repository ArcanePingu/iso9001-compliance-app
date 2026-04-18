import { requireAuth } from "@/lib/auth";

export default async function AdminPage() {
  await requireAuth({ permission: "view_admin_pages" });

  return (
    <main>
      <h1>Admin Area</h1>
      <p>Only admin users can access this route.</p>
    </main>
  );
}
