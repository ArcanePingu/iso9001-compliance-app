import {
  Bell,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  Shield,
} from "lucide-react";

import type { NavItem } from "@/types/navigation";

export const primaryNavigation: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clauses", href: "/clauses", icon: ClipboardCheck },
  { label: "Actions", href: "/actions", icon: ListChecks },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Admin", href: "/admin", icon: Shield },
];
