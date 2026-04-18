import { AppShell } from "@/components/layout/app-shell";

export default function AdminPage() {
  return (
    <AppShell>
      <section className="rounded-lg border bg-card p-6 shadow-panel">
        <h2 className="text-base font-semibold capitalize">admin</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder page for admin management. Replace with real workflows and data views.
        </p>
      </section>
    </AppShell>
  );
}
