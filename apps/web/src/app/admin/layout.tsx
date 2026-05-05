import { requireSuperAdmin } from "@/server/auth/guards";
import { listMyOrganizations } from "@/server/organization/actions";
import { getMyNotifications } from "@/server/notifications/queries";
import { auth } from "@/server/auth";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminSidebar } from "@/components/app-shell/admin-sidebar";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { SidebarProvider } from "@/components/app-shell/sidebar-context";
import { MainPane } from "@/components/app-shell/main-pane";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const session = await auth();

  // Best-effort active org so the topbar's switcher still works.
  const orgs = await listMyOrganizations();
  const activeOrg = orgs[0];
  const notifications = await getMyNotifications({ take: 20 });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <MainPane>
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
        </MainPane>
        <CommandPalette isAdmin />
      </div>
    </SidebarProvider>
  );
}
