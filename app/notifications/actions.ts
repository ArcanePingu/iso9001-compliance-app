"use server";

import { revalidatePath } from "next/cache";

import { markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/notifications";
import { requireAuth } from "@/src/lib/auth";

export async function markNotificationReadAction(formData: FormData) {
  const { profile } = await requireAuth({ permission: "read_compliance" });

  const notificationId = String(formData.get("notificationId") ?? "").trim();

  if (!profile?.id || !notificationId) {
    return;
  }

  await markNotificationAsRead(notificationId, profile.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const { profile } = await requireAuth({ permission: "read_compliance" });

  if (!profile?.id) {
    return;
  }

  await markAllNotificationsAsRead(profile.id);
  revalidatePath("/notifications");
}
