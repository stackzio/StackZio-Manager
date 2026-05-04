"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
  UserCog,
} from "lucide-react";
import type { OrgRole } from "@stackzio/db";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/logo";

const NAV: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/team", label: "Team", icon: UserCog, adminOnly: true },
  { href: "/organization", label: "Organization", icon: Building2, adminOnly: true },
];

export function Sidebar({ role, orgName: _orgName }: { role: OrgRole; orgName: string }) {
  const pathname = usePathname();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-transform",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Link
          href="/settings/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
