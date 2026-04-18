import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";

export default function AdminPage() {
  return (
    <AppShell>
      <section className="rounded-lg border bg-card p-6 shadow-panel">
        <h2 className="text-base font-semibold capitalize">admin</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder page for admin management. Replace with real workflows and data views.
        </p>
        <div className="mt-4">
          <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/audit-logs">
            Open audit log
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
