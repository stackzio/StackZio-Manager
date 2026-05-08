"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  CalendarClock,
  ChevronsLeft,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  UserCog,
} from "lucide-react";
import type { OrgRole } from "@stackzio/db";
import { cn } from "@/lib/cn";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/app-shell/sidebar-context";

const NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  memberOnly?: boolean;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // Members get a dedicated task hub right under the dashboard.
  { href: "/my-tasks", label: "My tasks", icon: ListChecks, memberOnly: true },
  // Clients are admin-only — members never see client info.
  { href: "/clients", label: "Clients", icon: Users, adminOnly: true },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  // Payments / revenue is admin-only — members never see money figures.
  { href: "/payments", label: "Payments", icon: CreditCard, adminOnly: true },
  { href: "/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/team", label: "Team", icon: UserCog, adminOnly: true },
  { href: "/organization", label: "Organization", icon: Building2, adminOnly: true },
];

export function Sidebar({ role }: { role: OrgRole }) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const items = NAV.filter((i) => {
    if (i.adminOnly && !isAdmin) return false;
    if (i.memberOnly && isAdmin) return false;
    return true;
  });

  return (
    <TooltipProvider delayDuration={120}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card lg:flex",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b transition-[padding] duration-200",
            collapsed ? "justify-center px-2" : "px-6",
          )}
        >
          <Link href="/dashboard" className="group flex items-center gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {collapsed ? (
                <motion.span
                  key="mark"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18 }}
                >
                  <LogoMark size={22} />
                </motion.span>
              ) : (
                <motion.span
                  key="full"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <Logo />
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-2.5 py-2.5" : "px-3 py-2",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {active ? (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-gradient"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <AnimatePresence initial={false}>
                  {!collapsed ? (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.16 }}
                      className="truncate whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        <div className="border-t p-3">
          {(() => {
            const settingsActive = pathname.startsWith("/settings");
            const link = (
              <Link
                href="/settings/profile"
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-2.5 py-2.5" : "px-3 py-2",
                  settingsActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Settings className="size-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {!collapsed ? (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.16 }}
                      className="truncate whitespace-nowrap"
                    >
                      Settings
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            );
            return collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Settings
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })()}
        </div>

        {/* Collapse toggle — pinned to the outer right edge of the sidebar */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-3 top-1/2 z-40 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-all",
            "hover:border-primary/40 hover:text-primary hover:scale-105",
          )}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="flex"
          >
            <ChevronsLeft className="size-3.5" />
          </motion.span>
        </button>
      </motion.aside>
    </TooltipProvider>
  );
}
