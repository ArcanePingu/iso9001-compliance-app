"use server";

import { revalidatePath } from "next/cache";

import { markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/notifications";
import { parseUuidInput } from "@/lib/validation";
import { requireAuth } from "@/src/lib/auth";

export async function markNotificationReadAction(formData: FormData) {
  const { profile } = await requireAuth({ permission: "read_compliance" });

  const notificationId = parseUuidInput(formData.get("notificationId"));

  if (!profile?.id || !notificationId) {
    return;
  }

  try {
    await markNotificationAsRead(notificationId, profile.id);
    revalidatePath("/notifications");
  } catch {
    // Keep this action resilient; notification syncing will reconcile on next page load.
  }
}

export async function markAllNotificationsReadAction() {
  const { profile } = await requireAuth({ permission: "read_compliance" });

  if (!profile?.id) {
    return;
  }

  try {
    await markAllNotificationsAsRead(profile.id);
    revalidatePath("/notifications");
  } catch {
    // Keep this action resilient; notification syncing will reconcile on next page load.
  }
}
