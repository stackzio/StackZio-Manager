import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@stackzio/lib/date";
import { getUserDetail } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin · User" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  const initials = (user.name ?? user.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name ?? user.email}
        description={user.email}
        breadcrumbs={
          <Link href="/admin/users" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Users
          </Link>
        }
        actions={
          user.isSuperAdmin ? (
            <Badge>
              <Shield className="size-3" /> Super admin
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Avatar className="size-16">
                {user.image ? <AvatarImage src={user.image} alt={user.name ?? user.email} /> : null}
                <AvatarFallback className="text-base">{initials || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user.name ?? "—"}</p>
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" /> {user.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Joined: <span className="text-muted-foreground">{formatDate(user.createdAt)}</span></p>
              <p>
                Status:{" "}
                <span className={user.emailVerified ? "text-success" : "text-muted-foreground"}>
                  {user.emailVerified ? "Email verified" : "Email unverified"}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Activity counts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Owned projects: <span className="font-medium">{user._count.ownedProjects}</span></p>
              <p>Project memberships: <span className="font-medium">{user._count.projectMembers}</span></p>
              <p>Meetings created: <span className="font-medium">{user._count.meetingsCreated}</span></p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organizations ({user.memberships.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {user.memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not a member of any organization.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {user.memberships.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/admin/organizations/${m.organization.id}`}
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/30"
                      >
                        <Avatar className="size-8 rounded-lg">
                          {m.organization.logoUrl ? (
                            <AvatarImage src={m.organization.logoUrl} alt={m.organization.name} />
                          ) : null}
                          <AvatarFallback className="rounded-lg text-xs">
                            {m.organization.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.organization.name}</p>
                          <p className="truncate text-xs text-muted-foreground">/{m.organization.slug}</p>
                        </div>
                        <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>{m.role}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
