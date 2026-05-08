import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Edit, FileSpreadsheet, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { getProject, listOrgUsersForAssignment } from "@/server/projects/queries";
import { canManageDocs, canSeeFinancials, requireOrg } from "@/server/auth/guards";
import { ProjectOverview } from "../_components/project-overview";
import { TasksTab } from "../_components/tasks-tab";
import { PaymentsTab } from "../_components/payments-tab";
import { TeamTab } from "../_components/team-tab";
import { DocsTab } from "../_components/docs-tab";
import { UpdatesTab } from "../_components/updates-tab";
import { DeleteProjectButton } from "../_components/delete-project-button";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, user } = await requireOrg();
  const project = await getProject(id);
  if (!project) notFound();

  const members = await listOrgUsersForAssignment();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isAssigned =
    project.ownerId === user.id || project.members.some((m) => m.userId === user.id);
  const canEditNonFinancial = isAdmin || isAssigned;
  const showFinancials = canSeeFinancials(role);
  const docsManager = canManageDocs(role);
  // Members don't see client info anywhere — same admin-only signal as financials.
  const showClient = showFinancials;

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={showClient ? project.client?.name ?? undefined : undefined}
        breadcrumbs={
          <Link href="/projects" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Projects
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            {showFinancials ? <Badge variant="secondary">{project.currency}</Badge> : null}
            {showFinancials ? (
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/statement`}>
                  <FileSpreadsheet className="size-4" /> Statement
                </Link>
              </Button>
            ) : null}
            {isAdmin ? (
              <Button asChild variant="gradient">
                <Link href={`/projects/${project.id}?tab=payments`}>
                  <Wallet className="size-4" /> Collect payment
                </Link>
              </Button>
            ) : null}
            {canEditNonFinancial ? (
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/edit`}>
                  <Edit className="size-4" /> Edit
                </Link>
              </Button>
            ) : null}
            {isAdmin ? <DeleteProjectButton projectId={project.id} /> : null}
          </div>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">Updates ({project.updates.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({project.tasks.length})</TabsTrigger>
          {showFinancials ? (
            <TabsTrigger value="payments">Payments ({project.payments.length})</TabsTrigger>
          ) : null}
          <TabsTrigger value="team">Team ({project.members.length})</TabsTrigger>
          <TabsTrigger value="docs">Docs ({project.docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview project={project} showFinancials={showFinancials} showClient={showClient} />
        </TabsContent>

        <TabsContent value="updates">
          <UpdatesTab
            projectId={project.id}
            updates={project.updates}
            currentUserId={user.id}
            isAdmin={isAdmin}
            canPost={canEditNonFinancial}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab
            projectId={project.id}
            tasks={project.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              dueDate: t.dueDate,
              assignee: t.assigneeId ? members.find((m) => m.id === t.assigneeId) ?? null : null,
            }))}
            members={members}
            canEdit={canEditNonFinancial}
          />
        </TabsContent>

        {showFinancials ? (
          <TabsContent value="payments">
            <PaymentsTab
              projectId={project.id}
              payments={project.payments}
              priceTotal={Number(project.priceTotal)}
              paid={project.paid}
              outstanding={project.outstanding}
              currency={project.currency}
              canEdit={isAdmin}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="team">
          <TeamTab
            projectId={project.id}
            owner={project.owner}
            members={members}
            isAdmin={isAdmin}
            currentValues={{
              name: project.name,
              description: project.description ?? "",
              clientId: project.clientId,
              ownerId: project.ownerId,
              category: project.category,
              status: project.status,
              priceTotal: Number(project.priceTotal),
              currency: project.currency,
              startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : "",
              deadline: project.deadline ? project.deadline.toISOString().slice(0, 10) : "",
              progressPct: project.progressPct,
              memberIds: project.members.map((m) => m.userId),
            }}
          />
        </TabsContent>

        <TabsContent value="docs">
          <DocsTab projectId={project.id} docs={project.docs} canEdit={docsManager} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
