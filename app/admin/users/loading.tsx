export default function AdminUsersLoading() {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-6 shadow-panel">
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-64 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>
      <div className="h-80 animate-pulse rounded-md border bg-muted/40" />
    </section>
  );
}
