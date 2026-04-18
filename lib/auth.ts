import type { RoleCode } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "staff" | "viewer";

export type AppProfile = {
  id: string;
  authUserId: string;
  fullName: string | null;
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

function toAppRole(roleCode: RoleCode | null | undefined): AppRole {
  switch (roleCode) {
    case "ADMIN":
      return "admin";
    case "STAFF":
      return "staff";
    default:
      return "viewer";
  }
}

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

  const profile = await prisma.profile.findUnique({
    where: { authUserId: user.id },
    select: {
      id: true,
      authUserId: true,
      fullName: true,
      role: {
        select: {
          code: true,
        },
      },
    },
  });

  const role = toAppRole(profile?.role.code);

  return {
    user,
    profile: profile
      ? {
          id: profile.id,
          authUserId: profile.authUserId,
          fullName: profile.fullName,
          role,
        }
      : null,
    role,
  };
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
