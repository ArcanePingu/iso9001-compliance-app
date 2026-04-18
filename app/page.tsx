import { AppShell } from "@/components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["Open CAPAs", "Overdue Actions", "Audit Findings", "Upcoming Reviews"].map((item) => (
          <div key={item} className="rounded-lg border bg-card p-5 shadow-panel">
            <p className="text-sm font-medium text-muted-foreground">{item}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">--</p>
            <p className="mt-2 text-xs text-muted-foreground">Connect data source to display live metrics.</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-lg border bg-card p-6 shadow-panel">
        <h2 className="text-base font-semibold">Quality Overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This is a starter shell for your internal compliance app. Add clause mappings, action tracking,
          and workflow automation from here.
        </p>
      </section>
    </AppShell>
  );
}
