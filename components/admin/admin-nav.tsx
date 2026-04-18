import Link from "next/link";

import { cn } from "@/lib/utils";

type AdminNavProps = {
  currentPath: string;
};

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/sites", label: "Sites" },
  { href: "/admin/audit-logs", label: "Audit logs" },
  { href: "/admin/clauses", label: "Clause library" },
] as const;

export function AdminNav({ currentPath }: AdminNavProps) {
  return (
    <nav className="flex flex-wrap gap-2">
      {ADMIN_LINKS.map((item) => {
        const isActive = currentPath === item.href;

        return (
          <Link
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
