"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Building2,
  CalendarClock,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Item {
  label: string;
  href?: string;
  action?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  shortcut?: string;
}

export function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const items: Item[] = [
    { group: "Go to", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "G D" },
    { group: "Go to", label: "Clients", href: "/clients", icon: Users, shortcut: "G C" },
    { group: "Go to", label: "Projects", href: "/projects", icon: FolderKanban, shortcut: "G P" },
    { group: "Go to", label: "Payments", href: "/payments", icon: CreditCard, shortcut: "G $" },
    { group: "Go to", label: "Meetings", href: "/meetings", icon: CalendarClock, shortcut: "G M" },
    ...(isAdmin
      ? [
          { group: "Go to", label: "Team", href: "/team", icon: UserCog },
          { group: "Go to", label: "Organization", href: "/organization", icon: Building2 },
        ]
      : []),
    { group: "Settings", label: "Profile", href: "/settings/profile", icon: Settings },
    { group: "Settings", label: "Account", href: "/settings/account", icon: Settings },
    { group: "Settings", label: "Appearance", href: "/settings/appearance", icon: Settings },
    { group: "Create", label: "New client", href: "/clients/new", icon: Plus, shortcut: "N C" },
    ...(isAdmin
      ? [{ group: "Create", label: "New project", href: "/projects/new", icon: Plus, shortcut: "N P" } as Item]
      : []),
    { group: "Create", label: "New meeting", href: "/meetings/new", icon: Plus, shortcut: "N M" },
  ];

  const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
    const key = it.group ?? "Other";
    (acc[key] ??= []).push(it);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[600px]">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command label="Command palette" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              placeholder="Search and jump…"
              className="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
              esc
            </kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-1">
            <Command.Empty className="p-6 text-center text-sm text-muted-foreground">
              No results.
            </Command.Empty>
            {Object.entries(groups).map(([group, list]) => (
              <Command.Group key={group} heading={group}>
                {list.map((it) => (
                  <Command.Item
                    key={`${group}:${it.label}`}
                    onSelect={() => (it.href ? go(it.href) : it.action?.())}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <it.icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{it.label}</span>
                    {it.shortcut ? (
                      <span className="text-[10px] font-medium tracking-widest text-muted-foreground">
                        {it.shortcut}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
