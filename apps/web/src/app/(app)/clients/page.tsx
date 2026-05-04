import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { listClients } from "@/server/clients/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ClientsTable } from "./_components/clients-table";
import { ListToolbar } from "./_components/list-toolbar";
import { Pagination } from "./_components/pagination";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : undefined;
  const dir = sp.dir === "desc" ? "desc" : "asc";
  const page = typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const result = await listClients({
    q,
    sort: (sort as "name" | "createdAt" | "company") ?? "name",
    dir,
    page,
  });

  const isFiltered = !!q;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description="Everyone you do business with — and how to reach them."
        actions={
          <Button asChild variant="gradient">
            <Link href="/clients/new">
              <Plus className="size-4" /> New client
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListToolbar placeholder="Search by name, company, email or phone…" />
        <p className="text-xs text-muted-foreground">
          {result.total} client{result.total === 1 ? "" : "s"}
        </p>
      </div>
      <ClientsTable
        rows={result.items}
        sort={result.sort}
        dir={result.dir}
        emptyState={
          <EmptyState
            icon={<Users className="size-5" />}
            title={isFiltered ? "No clients match your search" : "Add your first client"}
            description={
              isFiltered
                ? "Try a different keyword or clear the search."
                : "Once you add a client, you can start tracking their projects, payments, and meetings."
            }
            action={
              !isFiltered ? (
                <Button asChild variant="gradient">
                  <Link href="/clients/new">
                    <Plus className="size-4" /> New client
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
