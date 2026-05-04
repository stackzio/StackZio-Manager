import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProjectForm } from "../../_components/project-form";
import { PageHeader } from "@/components/page-header";
import {
  getProject,
  listOrgClientsForSelect,
  listOrgUsersForAssignment,
} from "@/server/projects/queries";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, role } = await requireOrg();
  const project = await getProject(id);
  if (!project) notFound();

  const [clients, members] = await Promise.all([listOrgClientsForSelect(), listOrgUsersForAssignment()]);
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const startDateISO = project.startDate ? project.startDate.toISOString().slice(0, 10) : "";
  const deadlineISO = project.deadline ? project.deadline.toISOString().slice(0, 10) : "";

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit ${project.name}`}
        breadcrumbs={
          <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Back to project
          </Link>
        }
      />
      <ProjectForm
        mode="edit"
        projectId={project.id}
        clients={clients}
        members={members}
        isAdmin={isAdmin}
        defaultCurrency={org.defaultCurrency}
        initial={{
          name: project.name,
          description: project.description ?? "",
          clientId: project.clientId,
          ownerId: project.ownerId,
          category: project.category,
          status: project.status,
          priceTotal: Number(project.priceTotal),
          currency: project.currency,
          progressPct: project.progressPct,
          memberIds: project.members.map((m) => m.userId),
          startDateISO,
          deadlineISO,
        }}
      />
    </div>
  );
}
