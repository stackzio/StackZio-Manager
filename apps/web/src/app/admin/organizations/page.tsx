import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ListToolbar } from "@/app/(app)/clients/_components/list-toolbar";
import { Pagination } from "@/app/(app)/clients/_components/pagination";
import { formatDate } from "@stackzio/lib/date";
import { listAllOrganizations } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin · Organizations" };

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
  const result = await listAllOrganizations({ q, page });

  return (
    <div className="space-y-4">
      <PageHeader title="Organizations" description="Every workspace on this instance." />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListToolbar placeholder="Search by name, slug or contact email…" />
        <p className="text-xs text-muted-foreground">{result.total} organization{result.total === 1 ? "" : "s"}</p>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title={q ? "No organizations match" : "No organizations yet"}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {result.items.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/organizations/${o.id}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/30"
                  >
                    <Avatar className="size-10 rounded-lg">
                      {o.logoUrl ? <AvatarImage src={o.logoUrl} alt={o.name} /> : null}
                      <AvatarFallback className="rounded-lg text-xs">{o.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{o.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{o.slug} · created by {o.createdBy.name ?? o.createdBy.email} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="hidden flex-wrap items-center gap-1 sm:flex">
                      <Badge variant="secondary">{o._count.members} members</Badge>
                      <Badge variant="outline">{o._count.projects} projects</Badge>
                      <Badge variant="outline">{o._count.clients} clients</Badge>
                      <Badge variant="outline">{o._count.payments} payments</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Pagination total={result.total} page={result.page} pageSize={result.pageSize} />
    </div>
  );
}
