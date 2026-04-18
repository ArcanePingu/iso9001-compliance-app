import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { syncUserNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/src/lib/auth";

import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function NotificationsPage() {
  const { profile } = await requireAuth({ permission: "read_compliance" });

  if (!profile?.id) {
    return null;
  }

  await syncUserNotifications(profile.id);

  const notifications = await prisma.notification.findMany({
    where: {
      recipientProfileId: profile.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <AppShell>
      <section className="rounded-lg border bg-card p-6 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">Unread: {unreadCount}</p>
          </div>

          <form action={markAllNotificationsReadAction}>
            <Button size="sm" type="submit" variant="outline">
              Mark all as read
            </Button>
          </form>
        </div>

        <div className="mt-6 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : null}

          {notifications.map((notification) => (
            <article
              className={`rounded-md border p-4 ${notification.isRead ? "bg-background/60" : "bg-secondary/40"}`}
              key={notification.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {notification.type.replaceAll("_", " ")} · {formatDateTime(notification.createdAt)}
                  </p>
                </div>

                {!notification.isRead ? (
                  <form action={markNotificationReadAction}>
                    <input name="notificationId" type="hidden" value={notification.id} />
                    <Button size="sm" type="submit" variant="secondary">
                      Mark read
                    </Button>
                  </form>
                ) : (
                  <span className="text-xs text-muted-foreground">Read</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
