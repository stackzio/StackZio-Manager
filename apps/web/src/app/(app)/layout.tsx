import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getActiveOrg } from "@/server/auth/guards";
import { listMyOrganizations } from "@/server/organization/actions";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/create-organization");

  const orgs = await listMyOrganizations();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={active.role} orgName={active.org.name} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <Topbar
          user={{
            id: session.user.id,
            name: session.user.name ?? null,
            email: session.user.email,
            image: session.user.image ?? null,
          }}
          activeOrg={{
            id: active.org.id,
            name: active.org.name,
            slug: active.org.slug,
            logoUrl: active.org.logoUrl,
            role: active.role,
          }}
          organizations={orgs}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
