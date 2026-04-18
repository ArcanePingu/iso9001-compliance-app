import { prisma } from "@/lib/prisma";

export async function getNotificationsForProfile(profileId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      recipientProfileId: profileId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
  };
}
