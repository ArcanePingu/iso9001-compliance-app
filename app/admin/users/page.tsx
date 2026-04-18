import { StatusMessage } from "@/components/ui/status-message";

import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminUsersPageData } from "@/lib/queries/admin-users";

import { updateUserRoleAction, updateUserStatusAction } from "../actions";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : null;
  const message = typeof params.message === "string" ? params.message : null;

  const [roles, users] = await getAdminUsersPageData();

  return (
    <section className="space-y-6 rounded-lg border bg-card p-6 shadow-panel">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold">User and profile management</h1>
          <p className="text-sm text-muted-foreground">
            Assign roles and control access for every profile.
          </p>
        </div>
        <AdminNav currentPath="/admin/users" />
      </header>

      {status && message ? <StatusMessage message={message} status={status === "error" ? "error" : "success"} /> : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-background/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role assignment</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-muted-foreground" colSpan={5}>No profiles found.</td>
              </tr>
            ) : users.map((user) => (
              <tr className="border-t" key={user.id}>
                <td className="px-3 py-2 font-medium">{user.fullName ?? "Unnamed user"}</td>
                <td className="px-3 py-2 text-muted-foreground">{user.email ?? "No email"}</td>
                <td className="px-3 py-2">
                  <form action={updateUserRoleAction} className="flex min-w-[240px] gap-2">
                    <input name="profileId" type="hidden" value={user.id} />
                    <select className="w-full rounded-md border bg-background px-2 py-1" defaultValue={String(user.roleId)} name="roleId">
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name} ({role.code})</option>
                      ))}
                    </select>
                    <button className="rounded-md border px-3 py-1 text-xs font-medium" type="submit">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form action={updateUserStatusAction} className="flex items-center gap-2">
                    <input name="profileId" type="hidden" value={user.id} />
                    <select className="rounded-md border bg-background px-2 py-1" defaultValue={String(user.isActive)} name="isActive">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <button className="rounded-md border px-3 py-1 text-xs font-medium" type="submit">Update</button>
                  </form>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{formatDateTime(user.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
