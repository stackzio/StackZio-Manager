import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getActiveOrg } from "@/server/auth/guards";
import { listMyOrganizations } from "@/server/organization/actions";
import { getMyNotifications } from "@/server/notifications/queries";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { SidebarProvider } from "@/components/app-shell/sidebar-context";
import { MainPane } from "@/components/app-shell/main-pane";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/create-organization");

  const [orgs, notifications] = await Promise.all([
    listMyOrganizations(),
    getMyNotifications({ sweep: true, take: 20 }),
  ]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar role={active.role} canSeeFinancials={active.canSeeFinancials} />
        <MainPane>
          <Topbar
            user={{
              id: session.user.id,
              name: session.user.name ?? null,
              email: session.user.email,
              image: session.user.image ?? null,
              isSuperAdmin: Boolean(session.user.isSuperAdmin),
            }}
            activeOrg={{
              id: active.org.id,
              name: active.org.name,
              slug: active.org.slug,
              logoUrl: active.org.logoUrl,
              role: active.role,
            }}
            organizations={orgs}
            notifications={{ unread: notifications.unread, items: notifications.items }}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </MainPane>
        <CommandPalette isAdmin={active.role === "OWNER" || active.role === "ADMIN"} />
      </div>
    </SidebarProvider>
  );
}
