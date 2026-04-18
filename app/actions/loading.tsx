import { AppShell } from "@/components/layout/app-shell";

export default function ActionsLoading() {
  return (
    <AppShell>
      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
        <div className="animate-pulse space-y-2">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>
        <div className="h-24 animate-pulse rounded-md border bg-muted/40" />
        <div className="h-80 animate-pulse rounded-md border bg-muted/40" />
      </section>
    </AppShell>
  );
}
