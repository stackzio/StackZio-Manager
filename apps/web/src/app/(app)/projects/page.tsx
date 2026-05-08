import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { listProjects } from "@/server/projects/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProjectsTable } from "./_components/projects-table";
import { ProjectsToolbar } from "./_components/projects-toolbar";
import { Pagination } from "../clients/_components/pagination";
import { canSeeFinancials, requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { role } = await requireOrg();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const showFinancials = canSeeFinancials(role);

  const result = await listProjects({
    q: typeof sp.q === "string" ? sp.q : undefined,
    status: typeof sp.status === "string" ? sp.status : undefined,
    category: typeof sp.category === "string" ? sp.category : undefined,
    sort: (typeof sp.sort === "string" ? sp.sort : "createdAt") as "name" | "createdAt" | "deadline" | "priceTotal",
    dir: sp.dir === "asc" ? "asc" : "desc",
    page: typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1,
  });

  const isFiltered = Boolean(sp.q || sp.status || sp.category);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description={
          showFinancials
            ? "Track every engagement — price, progress, payments, team."
            : "Your assigned projects — status, progress, tasks, team."
        }
        actions={
          isAdmin ? (
            <Button asChild variant="gradient">
              <Link href="/projects/new">
                <Plus className="size-4" /> New project
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ProjectsToolbar />
        <p className="text-xs text-muted-foreground">
          {result.total} project{result.total === 1 ? "" : "s"}
        </p>
      </div>
      <ProjectsTable
        rows={result.items}
        sort={result.sort}
        dir={result.dir}
        showFinancials={showFinancials}
        emptyState={
          <EmptyState
            icon={<FolderKanban className="size-5" />}
            title={isFiltered ? "No projects match your filters" : "Start your first project"}
            description={
              isFiltered
                ? "Try clearing the filters or searching for something else."
                : "Projects link a client, a price, a team, and a timeline."
            }
            action={
              isAdmin && !isFiltered ? (
                <Button asChild variant="gradient">
                  <Link href="/projects/new">
                    <Plus className="size-4" /> New project
                  </Link>
                </Button>
              ) : null
            }
          />
        }
      />
      <Pagination total={result.total} page={result.page} pageSize={result.pageSize} />
    </div>
  );
}
