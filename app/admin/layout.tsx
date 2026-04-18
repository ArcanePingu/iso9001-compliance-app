import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/src/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth({ permission: "view_admin_pages" });

  return <AppShell>{children}</AppShell>;
}
