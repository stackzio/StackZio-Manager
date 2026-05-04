import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ListToolbar } from "@/app/(app)/clients/_components/list-toolbar";
import { Pagination } from "@/app/(app)/clients/_components/pagination";
import { formatDate } from "@stackzio/lib/date";
import { listAllUsers } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
  const result = await listAllUsers({ q, page });

  return (
    <div className="space-y-4">
      <PageHeader title="Users" description="Every account on this instance." />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListToolbar placeholder="Search by name or email…" />
        <p className="text-xs text-muted-foreground">{result.total} user{result.total === 1 ? "" : "s"}</p>
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title={q ? "No users match" : "No users yet"} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {result.items.map((u) => {
                const initials = (u.name ?? u.email)
                  .split(/[\s.@]+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("");
                return (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/30"
                    >
                      <Avatar className="size-10">
                        {u.image ? <AvatarImage src={u.image} alt={u.name ?? u.email} /> : null}
                        <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{u.name ?? u.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email} · joined {formatDate(u.createdAt)}
                        </p>
                      </div>
                      <div className="hidden flex-wrap items-center gap-1 sm:flex">
                        <Badge variant="secondary">{u._count.memberships} orgs</Badge>
                        <Badge variant="outline">{u._count.ownedProjects} owned</Badge>
                      </div>
                      {u.isSuperAdmin ? (
                        <Badge>
                          <Shield className="size-3" /> Super
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
      <Pagination total={result.total} page={result.page} pageSize={result.pageSize} />
    </div>
  );
}
