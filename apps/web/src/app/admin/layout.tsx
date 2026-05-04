import Link from "next/link";
import { Building2, LayoutDashboard, Shield, Users } from "lucide-react";
import { requireSuperAdmin } from "@/server/auth/guards";
import { listMyOrganizations } from "@/server/organization/actions";
import { getMyNotifications } from "@/server/notifications/queries";
import { auth } from "@/server/auth";
import { Topbar } from "@/components/app-shell/topbar";
import { Logo } from "@/components/brand/logo";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const session = await auth();

  // Best-effort active org so the topbar's switcher still works.
  const orgs = await listMyOrganizations();
  const activeOrg = orgs[0];
  const notifications = await getMyNotifications({ take: 20 });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
          </Link>
        </div>
        <div className="px-3 py-3">
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs">
            <p className="flex items-center gap-1 font-semibold text-warning">
              <Shield className="size-3" /> Super admin
            </p>
            <p className="mt-0.5 text-muted-foreground">Global view across the whole instance.</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <AdminNavLink key={item.href} href={item.href} exact={item.exact}>
                <Icon className="size-4" /> {item.label}
              </AdminNavLink>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            ← Back to app
          </Link>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {activeOrg ? (
          <Topbar
            user={{
              id: user.id,
              name: session?.user?.name ?? null,
              email: user.email,
              image: session?.user?.image ?? null,
              isSuperAdmin: true,
            }}
            activeOrg={activeOrg}
            organizations={orgs}
            notifications={{ unread: notifications.unread, items: notifications.items }}
          />
        ) : null}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <CommandPalette isAdmin />
    </div>
  );
}

function AdminNavLink({
  href,
  exact,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  // Server component — can't use usePathname. Just style based on the href starting.
  // Active styling is driven by the server-rendered URL via aria-current.
  return (
    <Link
      href={href}
      data-href={href}
      data-exact={exact ? "1" : "0"}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </Link>
  );
}
