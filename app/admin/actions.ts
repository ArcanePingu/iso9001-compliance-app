"use server";

import { AuditActionType, EntityType, Prisma, RoleCode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAuditLogs } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { normalizeOptionalText, normalizeText, parseBooleanInput, parseIntegerInput, parseUuidInput } from "@/lib/validation";
import { requireAuth } from "@/src/lib/auth";

function buildSearchTarget(pathname: string, status: "success" | "error", message: string) {
  const params = new URLSearchParams({
    status,
    message,
  });

  return `${pathname}?${params.toString()}`;
}

export async function updateUserRoleAction(formData: FormData) {
  const { profile } = await requireAuth({ permission: "manage_users" });

  const profileId = parseUuidInput(formData.get("profileId"));
  const roleId = parseIntegerInput(formData.get("roleId"));

  if (!profileId || roleId === null) {
    redirect(buildSearchTarget("/admin/users", "error", "Profile and role are required."));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.profile.findUnique({
        where: { id: profileId },
        select: { roleId: true },
      });

      if (!existing) {
        throw new Error("Profile was not found.");
      }

      const role = await tx.role.findUnique({
        where: { id: roleId },
        select: { id: true },
      });

      if (!role) {
        throw new Error("Role was not found.");
      }

      await tx.profile.update({
        where: { id: profileId },
        data: { roleId },
      });

      await createAuditLogs(tx, {
        entityType: EntityType.PROFILE,
        entityId: profileId,
        actionType: AuditActionType.UPDATE,
        changedByProfileId: profile?.id ?? null,
        changes: [{ fieldName: "role_id", oldValue: String(existing.roleId), newValue: String(roleId) }],
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update role.";
    redirect(buildSearchTarget("/admin/users", "error", message));
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
  revalidatePath("/admin/audit-logs");
  redirect(buildSearchTarget("/admin/users", "success", "User role updated."));
}

export async function updateUserStatusAction(formData: FormData) {
  const { profile } = await requireAuth({ permission: "manage_users" });

  const profileId = parseUuidInput(formData.get("profileId"));
  const isActive = parseBooleanInput(formData.get("isActive"));

  if (!profileId || isActive === null) {
    redirect(buildSearchTarget("/admin/users", "error", "Invalid user status payload."));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.profile.findUnique({
        where: { id: profileId },
        select: { isActive: true },
      });

      if (!existing) {
        throw new Error("Profile was not found.");
      }

      await tx.profile.update({
        where: { id: profileId },
        data: { isActive },
      });

      await createAuditLogs(tx, {
        entityType: EntityType.PROFILE,
        entityId: profileId,
        actionType: AuditActionType.UPDATE,
        changedByProfileId: profile?.id ?? null,
        changes: [{ fieldName: "is_active", oldValue: String(existing.isActive), newValue: String(isActive) }],
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update user status.";
    redirect(buildSearchTarget("/admin/users", "error", message));
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit-logs");
  redirect(buildSearchTarget("/admin/users", "success", "User status updated."));
}

export async function createSiteAction(formData: FormData) {
  const { profile } = await requireAuth({ permission: "manage_sites" });

  const code = normalizeText(formData.get("code")).toUpperCase();
  const name = normalizeText(formData.get("name"));
  const location = normalizeOptionalText(formData.get("location"));

  if (!code || !name) {
    redirect(buildSearchTarget("/admin/sites", "error", "Site code and name are required."));
  }

  if (code.length > 20) {
    redirect(buildSearchTarget("/admin/sites", "error", "Site code must be 20 characters or fewer."));
  }
  if (name.length > 120) {
    redirect(buildSearchTarget("/admin/sites", "error", "Site name must be 120 characters or fewer."));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.site.create({
        data: {
          code,
          name,
          location,
        },
        select: { id: true },
      });

      await createAuditLogs(tx, {
        entityType: EntityType.SITE,
        entityId: created.id,
        actionType: AuditActionType.CREATE,
        changedByProfileId: profile?.id ?? null,
        changes: [
          { fieldName: "code", oldValue: null, newValue: code },
          { fieldName: "name", oldValue: null, newValue: name },
          { fieldName: "location", oldValue: null, newValue: location },
        ],
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(buildSearchTarget("/admin/sites", "error", "A site with that code already exists."));
    }

    const message = error instanceof Error ? error.message : "Unable to create site.";
    redirect(buildSearchTarget("/admin/sites", "error", message));
  }

  revalidatePath("/admin/sites");
  revalidatePath("/admin/audit-logs");
  redirect(buildSearchTarget("/admin/sites", "success", "Site created."));
}

export async function updateSiteAction(formData: FormData) {
  const { profile } = await requireAuth({ permission: "manage_sites" });

  const siteId = parseUuidInput(formData.get("siteId"));
  const code = normalizeText(formData.get("code")).toUpperCase();
  const name = normalizeText(formData.get("name"));
  const location = normalizeOptionalText(formData.get("location"));
  const isActive = parseBooleanInput(formData.get("isActive"));

  if (!siteId || !code || !name || isActive === null) {
    redirect(buildSearchTarget("/admin/sites", "error", "Invalid site update payload."));
  }
  if (code.length > 20) {
    redirect(buildSearchTarget("/admin/sites", "error", "Site code must be 20 characters or fewer."));
  }
  if (name.length > 120) {
    redirect(buildSearchTarget("/admin/sites", "error", "Site name must be 120 characters or fewer."));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.site.findUnique({
        where: { id: siteId },
        select: { code: true, name: true, location: true, isActive: true },
      });

      if (!existing) {
        throw new Error("Site was not found.");
      }

      await tx.site.update({
        where: { id: siteId },
        data: {
          code,
          name,
          location,
          isActive,
        },
      });

      await createAuditLogs(tx, {
        entityType: EntityType.SITE,
        entityId: siteId,
        actionType: AuditActionType.UPDATE,
        changedByProfileId: profile?.id ?? null,
        changes: [
          { fieldName: "code", oldValue: existing.code, newValue: code },
          { fieldName: "name", oldValue: existing.name, newValue: name },
          { fieldName: "location", oldValue: existing.location, newValue: location },
          { fieldName: "is_active", oldValue: String(existing.isActive), newValue: String(isActive) },
        ].filter((change) => change.oldValue !== change.newValue),
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(buildSearchTarget("/admin/sites", "error", "A site with that code already exists."));
    }

    const message = error instanceof Error ? error.message : "Unable to update site.";
    redirect(buildSearchTarget("/admin/sites", "error", message));
  }

  revalidatePath("/admin/sites");
  revalidatePath("/admin/audit-logs");
  redirect(buildSearchTarget("/admin/sites", "success", "Site updated."));
}

export async function seedRoleDescriptionsAction() {
  await requireAuth({ permission: "manage_users" });

  const descriptions: Record<RoleCode, string> = {
    ADMIN: "Full access to compliance records and administrative settings.",
    STAFF: "Can update compliance records, actions, and comments.",
    VIEWER: "Read-only access to clauses and compliance status.",
  };

  await prisma.$transaction(
    Object.entries(descriptions).map(([code, description]) => prisma.role.updateMany({
      where: { code: code as RoleCode, description: null },
      data: { description },
    })),
  );

  revalidatePath("/admin/roles");
  redirect(buildSearchTarget("/admin/roles", "success", "Role descriptions were refreshed where empty."));
}
