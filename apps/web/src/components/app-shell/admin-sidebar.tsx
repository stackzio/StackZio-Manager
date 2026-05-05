"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronsLeft,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/app-shell/sidebar-context";
import { cn } from "@/lib/cn";

const NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <TooltipProvider delayDuration={120}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card lg:flex"
      >
        <div
          className={cn(
            "flex h-16 items-center border-b transition-[padding] duration-200",
            collapsed ? "justify-center px-2" : "px-6",
          )}
        >
          <Link href="/admin" className="flex items-center gap-2">
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

        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-3"
            >
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs">
                <p className="flex items-center gap-1 font-semibold text-warning">
                  <Shield className="size-3" /> Super admin
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Global view across the whole instance.
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <nav className="flex-1 space-y-1 px-3 py-1">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
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
                    "size-4 shrink-0",
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
            const link = (
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors",
                  collapsed ? "justify-center px-2.5 py-2.5" : "px-3 py-2",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <ChevronsLeft className="size-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {!collapsed ? (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.16 }}
                      className="truncate whitespace-nowrap"
                    >
                      Back to app
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            );
            return collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Back to app
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })()}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-1/2 z-40 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-all hover:scale-105 hover:border-primary/40 hover:text-primary"
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
