import { AppShell } from "@/components/layout/app-shell";

export default function ClauseDetailLoading() {
  return (
    <AppShell>
      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
        <div className="h-8 w-72 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-md border bg-muted/40" />
        <div className="h-64 animate-pulse rounded-md border bg-muted/40" />
      </section>
    </AppShell>
  );
}
