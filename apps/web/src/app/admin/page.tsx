import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Building2,
  CreditCard,
  FolderKanban,
  Shield,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDate, timeAgo } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { getAdminOverview } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const data = await getAdminOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super admin overview"
        description="Global view across every user, organization, and project on this instance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users className="size-4" />} label="Users" value={String(data.userCount)} accent="primary" sub={`${data.superAdminCount} super admin`} />
        <Stat icon={<Building2 className="size-4" />} label="Organizations" value={String(data.orgCount)} accent="success" sub={`${data.activeOrgsLast7d} active in 7d`} />
        <Stat icon={<FolderKanban className="size-4" />} label="Projects" value={String(data.projectCount)} sub={`${data.activeProjectCount} active`} />
        <Stat
          icon={<CreditCard className="size-4" />}
          label="Payments this month"
          value={formatMoney(data.paymentSumThisMonth, "INR")}
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" /> Newest organizations
              </CardTitle>
              <CardDescription>Latest 8 — click to inspect.</CardDescription>
            </div>
            <Link href="/admin/organizations" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.topOrgs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organizations yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.topOrgs.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/organizations/${o.id}`}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/30"
                    >
                      <Avatar className="size-9 rounded-lg">
                        {o.logoUrl ? <AvatarImage src={o.logoUrl} alt={o.name} /> : null}
                        <AvatarFallback className="rounded-lg text-xs">{o.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{o.name}</p>
                        <p className="truncate text-xs text-muted-foreground">/{o.slug} · {timeAgo(o.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">{o._count.members}m</Badge>
                        <Badge variant="outline">{o._count.projects}p</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" /> Recent signups
              </CardTitle>
              <CardDescription>The last 8 users to join.</CardDescription>
            </div>
            <Link href="/admin/users" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.recentSignups.map((u) => {
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
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/30"
                      >
                        <Avatar className="size-9">
                          {u.image ? <AvatarImage src={u.image} alt={u.name ?? u.email} /> : null}
                          <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{u.name ?? u.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email} · {formatDate(u.createdAt)}</p>
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
            )}
            <Activity className="hidden" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "primary" | "warning" | "success";
  sub?: string;
}) {
  const tone =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "warning"
        ? "bg-warning/10 text-warning"
        : accent === "success"
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-lg p-2 ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-xl font-semibold tabular-nums">{value}</p>
          {sub ? <p className="truncate text-[10px] text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
