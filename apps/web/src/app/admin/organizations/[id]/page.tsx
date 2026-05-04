import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ChevronLeft, Mail, MapPin, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDate, timeAgo } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { getOrganizationDetail } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin · Organization" };

export default async function AdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganizationDetail(id);
  if (!org) notFound();

  const address = [org.addressLine1, org.addressLine2, org.city, org.state, org.country, org.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={org.description ?? undefined}
        breadcrumbs={
          <Link href="/admin/organizations" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Organizations
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Avatar className="size-16 rounded-2xl">
                {org.logoUrl ? <AvatarImage src={org.logoUrl} alt={org.name} /> : null}
                <AvatarFallback className="rounded-2xl text-base">{org.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{org.name}</p>
                <p className="text-xs text-muted-foreground">/{org.slug}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row icon={<Mail className="size-4" />} label={org.contactEmail ?? "—"} />
              <Row icon={<Phone className="size-4" />} label={org.contactPhone ?? "—"} />
              <Row icon={<MapPin className="size-4" />} label={address || "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Created
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>by <span className="font-medium">{org.createdBy.name ?? org.createdBy.email}</span></p>
              <p className="text-muted-foreground">{formatDate(org.createdAt)} · {timeAgo(org.createdAt)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Members" value={String(org._count.members)} />
            <Stat label="Clients" value={String(org._count.clients)} />
            <Stat label="Projects" value={String(org._count.projects)} />
            <Stat label="Total payments" value={formatMoney(org.totalPayments, org.defaultCurrency as never)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" /> Members ({org.members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {org.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {org.members.map((m) => {
                    const u = m.user;
                    const initials = (u.name ?? u.email)
                      .split(/[\s.@]+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("");
                    return (
                      <li key={m.id}>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/30"
                        >
                          <Avatar className="size-8">
                            {u.image ? <AvatarImage src={u.image} alt={u.name ?? u.email} /> : null}
                            <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.name ?? u.email}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email} · joined {formatDate(m.joinedAt)}</p>
                          </div>
                          <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>{m.role}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
