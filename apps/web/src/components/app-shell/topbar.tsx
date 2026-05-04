"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "next-auth/react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  LogOut,
  Plus,
  Search,
  Settings as SettingsIcon,
  Shield,
  User as UserIcon,
} from "lucide-react";
import type { NotificationKind, OrgRole } from "@stackzio/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { switchOrganizationAction } from "@/server/organization/actions";
import { cn } from "@/lib/cn";

interface TopbarUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isSuperAdmin?: boolean;
}

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: OrgRole;
}

interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function Topbar({
  user,
  activeOrg,
  organizations,
  notifications,
}: {
  user: TopbarUser;
  activeOrg: OrgItem;
  organizations: OrgItem[];
  notifications: { unread: number; items: NotificationItem[] };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const initials = (user.name ?? user.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  function switchOrg(id: string) {
    if (id === activeOrg.id) return;
    start(async () => {
      const res = await switchOrganizationAction({ organizationId: id });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 max-w-[220px] justify-between gap-2 px-2.5">
            <span className="flex items-center gap-2 overflow-hidden">
              <Avatar className="size-6 rounded-md">
                {activeOrg.logoUrl ? (
                  <AvatarImage src={activeOrg.logoUrl} alt={activeOrg.name} />
                ) : null}
                <AvatarFallback className="rounded-md text-[10px]">
                  {activeOrg.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">{activeOrg.name}</span>
            </span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => switchOrg(o.id)}
              disabled={pending}
              className={cn("flex items-center justify-between gap-3", o.id === activeOrg.id && "bg-accent/40")}
            >
              <span className="flex items-center gap-2 truncate">
                <Avatar className="size-6 rounded-md">
                  {o.logoUrl ? <AvatarImage src={o.logoUrl} alt={o.name} /> : null}
                  <AvatarFallback className="rounded-md text-[10px]">
                    {o.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{o.name}</span>
              </span>
              {o.id === activeOrg.id ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/organizations" className="flex items-center gap-2">
              <Building2 /> Manage organizations
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/organizations/new" className="flex items-center gap-2">
              <Plus /> Create organization
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden flex-1 items-center md:flex">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search… ( ⌘K )"
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell initialUnread={notifications.unread} initialItems={notifications.items} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar className="size-9">
                {user.image ? <AvatarImage src={user.image} alt={user.name ?? user.email} /> : null}
                <AvatarFallback>{initials || "U"}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user.name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="flex items-center gap-2">
                <UserIcon /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/account" className="flex items-center gap-2">
                <SettingsIcon /> Settings
              </Link>
            </DropdownMenuItem>
            {user.isSuperAdmin ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Super admin</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-2">
                    <Shield /> Admin dashboard
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
