import Link from "next/link";
import { requireAuth, hasPermission } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";

export default async function DashboardPage() {
  const { user, profile, role } = await requireAuth();

  return (
    <main>
      <h1>ISO 9001 Compliance App</h1>
      <p>Signed in as: {user.email}</p>
      <p>Role: {role}</p>
      <p>Profile status: {profile ? "Profile loaded" : "No profile yet (safe viewer fallback)"}</p>

      <ul>
        <li>
          <Link href="/compliance">Compliance records</Link>
        </li>
        <li>
          <Link href="/comments">Comments</Link>
        </li>
        <li>
          <Link href="/actions">Actions</Link>
        </li>
        {hasPermission(role!, "manage_sites") && (
          <li>
            <Link href="/sites">Site management</Link>
          </li>
        )}
        {hasPermission(role!, "manage_users") && (
          <li>
            <Link href="/manage-users">User management</Link>
          </li>
        )}
        {hasPermission(role!, "view_admin_pages") && (
          <li>
            <Link href="/admin">Admin area</Link>
          </li>
        )}
      </ul>

      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
