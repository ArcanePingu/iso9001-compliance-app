import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "staff" | "viewer";

export type AppProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  role: AppRole;
};

export type AppPermission =
  | "read_compliance"
  | "edit_compliance"
  | "edit_comments"
  | "edit_actions"
  | "manage_users"
  | "manage_sites"
  | "view_admin_pages";

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<AppPermission>> = {
  viewer: new Set(["read_compliance"]),
  staff: new Set(["read_compliance", "edit_compliance", "edit_comments", "edit_actions"]),
  admin: new Set([
    "read_compliance",
    "edit_compliance",
    "edit_comments",
    "edit_actions",
    "manage_users",
    "manage_sites",
    "view_admin_pages",
  ]),
};

export function hasPermission(role: AppRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export async function getCurrentUserWithProfile() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null, role: null as AppRole | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,user_id,full_name,role")
    .eq("user_id", user.id)
    .maybeSingle<AppProfile>();

  // Safe fallback for signed-in users that do not have a profile yet.
  const role: AppRole = profile?.role ?? "viewer";

  return { user, profile: profile ?? null, role };
}

export async function requireAuth(options?: {
  permission?: AppPermission;
  role?: AppRole;
}) {
  const current = await getCurrentUserWithProfile();

  if (!current.user) {
    redirect("/login");
  }

  if (options?.role && current.role !== options.role) {
    redirect("/unauthorized");
  }

  if (options?.permission && !hasPermission(current.role!, options.permission)) {
    redirect("/unauthorized");
  }

  return current;
}
