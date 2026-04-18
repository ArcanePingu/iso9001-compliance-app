import { requireAuth } from "@/lib/auth";

export default async function SitesPage() {
  await requireAuth({ permission: "manage_sites" });

  return (
    <main>
      <h1>Site Management</h1>
      <p>Admin-only page for site definitions and assignments.</p>
    </main>
  );
}
