import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { syncUserNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/src/lib/auth";

export async function TopHeader() {
  const { profile } = await requireAuth({ permission: "read_compliance" });

  const userId = profile?.id;

  if (userId) {
    await syncUserNotifications(userId);
  }

  const unreadCount = userId
    ? await prisma.notification.count({
        where: {
          recipientProfileId: userId,
          isRead: false,
        },
      })
    : 0;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Internal Quality System</p>
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="size-4" />
          Search
        </Button>

        <Link
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "relative")}
          href="/notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
