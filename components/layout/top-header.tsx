import { Bell, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TopHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Internal Quality System</p>
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="size-4" />
          Search
        </Button>
        <Button variant="secondary" size="sm">
          <Bell className="size-4" />
        </Button>
      </div>
    </header>
  );
}
