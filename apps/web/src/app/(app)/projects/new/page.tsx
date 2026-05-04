import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProjectForm } from "../_components/project-form";
import { PageHeader } from "@/components/page-header";
import { listOrgClientsForSelect, listOrgUsersForAssignment } from "@/server/projects/queries";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const { org, role, user } = await requireOrg();
  if (role !== "OWNER" && role !== "ADMIN") redirect("/projects");

  const [clients, members] = await Promise.all([listOrgClientsForSelect(), listOrgUsersForAssignment()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="New project"
        breadcrumbs={
          <Link href="/projects" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Projects
          </Link>
        }
      />
      {clients.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          You need a client first. <Link href="/clients/new" className="font-medium text-primary hover:underline">Create one</Link>.
        </div>
      ) : (
        <ProjectForm
          mode="create"
          clients={clients}
          members={members}
          isAdmin
          defaultCurrency={org.defaultCurrency}
          initial={{
            ownerId: user.id,
            currency: org.defaultCurrency,
            status: "LEAD",
            category: "WEBSITE",
            progressPct: 0,
          }}
        />
      )}
    </div>
  );
}
