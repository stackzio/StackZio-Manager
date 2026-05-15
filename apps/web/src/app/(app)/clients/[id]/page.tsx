import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building,
  CalendarClock,
  ChevronLeft,
  Edit,
  ExternalLink,
  FolderKanban,
  Globe,
  Mail,
  MapPin,
  Phone,
  StickyNote,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDate, timeAgo } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { getClient } from "@/server/clients/queries";
import { requireOrg } from "@/server/auth/guards";
import { DeleteClientButton } from "../_components/delete-client-button";
import { InterestBadge } from "@/features/clients/components/interest-badge";
import { InterestSelect } from "@/features/clients/components/interest-select";
import { FollowUpCard } from "@/features/clients/components/follow-up-card";
import { DiscussionTimeline } from "@/features/clients/components/discussion-timeline";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, role, user } = await requireOrg();
  const client = await getClient(id);
  if (!client) notFound();

  const initials = client.name.slice(0, 2).toUpperCase();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const address = [client.addressLine1, client.addressLine2, client.city, client.state, client.country, client.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={client.company ?? undefined}
        breadcrumbs={
          <Link href="/clients" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Clients
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}/edit`}>
                <Edit className="size-4" /> Edit
              </Link>
            </Button>
            {isAdmin ? <DeleteClientButton clientId={client.id} disabled={client.projects.length > 0} /> : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Avatar className="size-16 rounded-2xl">
                <AvatarFallback className="rounded-2xl text-base">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{client.name}</p>
                {client.company ? (
                  <p className="text-sm text-muted-foreground">{client.company}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={<Mail className="size-4" />} label={client.email ?? "—"} href={client.email ? `mailto:${client.email}` : undefined} />
              <Row icon={<Phone className="size-4" />} label={client.phone ?? "—"} href={client.phone ? `tel:${client.phone}` : undefined} />
              <Row icon={<Globe className="size-4" />} label={client.website ?? "—"} href={client.website ?? undefined} external />
              <Row icon={<MapPin className="size-4" />} label={address || "—"} />
            </CardContent>
          </Card>

          <FollowUpCard
            clientId={client.id}
            followUpAt={client.followUpAt ? client.followUpAt.toISOString() : null}
            followUpReason={client.followUpReason}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                People ({client.contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet.</p>
              ) : (
                client.contacts.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{c.name}</p>
                      {c.role ? <Badge variant="secondary">{c.role}</Badge> : null}
                    </div>
                    {c.email ? <p className="mt-1 text-muted-foreground">{c.email}</p> : null}
                    {c.phone ? <p className="text-muted-foreground">{c.phone}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <InterestBadge status={client.interestStatus} />
              </div>
              <InterestSelect clientId={client.id} value={client.interestStatus} />
            </CardHeader>
          </Card>

          <DiscussionTimeline
            clientId={client.id}
            notes={client.discussionNotes.map((n) => ({
              id: n.id,
              body: n.body,
              kind: n.kind,
              createdAt: n.createdAt.toISOString(),
              updatedAt: n.updatedAt.toISOString(),
              author: n.author,
            }))}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="size-4 text-primary" /> Projects ({client.projects.length})
              </CardTitle>
              <CardDescription>Everything we&apos;ve done — or are doing — for this client.</CardDescription>
            </CardHeader>
            <CardContent>
              {client.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {client.projects.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.category} · {p.status} · {timeAgo(p.updatedAt)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">{formatMoney(Number(p.priceTotal), p.currency as never)}</p>
                          <p className="text-xs text-muted-foreground">{p.progressPct}% complete</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" /> Recent meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No meetings logged yet.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {client.meetings.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-4 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{formatDate(m.scheduledAt, "dd MMM yyyy, h:mm a")}</p>
                      </div>
                      <Badge variant={m.status === "DONE" ? "success" : m.status === "CANCELLED" ? "destructive" : "secondary"}>
                        {m.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {client.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="size-4 text-primary" /> Background
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{client.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            <Building className="mr-1 inline size-3" /> {org.name} · added {timeAgo(client.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  external?: boolean;
}) {
  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="truncate">{label}</span>
        {external ? <ExternalLink className="size-3 text-muted-foreground" /> : null}
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate text-muted-foreground">{label}</span>
    </div>
  );
}
