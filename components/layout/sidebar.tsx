import Link from "next/link";

import { primaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <p className="text-sm font-semibold tracking-wide">ISO 9001 COMPLIANCE</p>
      </div>

      <nav className="space-y-1 p-4">
        {primaryNavigation.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                isActive && "bg-secondary text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
