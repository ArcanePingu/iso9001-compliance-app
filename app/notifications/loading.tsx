import { AppShell } from "@/components/layout/app-shell";

export default function NotificationsLoading() {
  return (
    <AppShell>
      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
        <div className="animate-pulse space-y-2">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-24 animate-pulse rounded-md border bg-muted/40" key={index} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
