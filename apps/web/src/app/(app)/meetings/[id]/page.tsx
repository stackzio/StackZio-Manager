import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Edit,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Video,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatDateTime, timeAgo } from "@stackzio/lib/date";
import { getMeeting } from "@/server/meetings/queries";
import { requireOrg } from "@/server/auth/guards";
import { MeetingActions } from "../_components/meeting-actions";

export const metadata: Metadata = { title: "Meeting" };

const LOCATION_LABEL: Record<string, string> = {
  ONLINE: "Online",
  CLIENT_LOCATION: "At client location",
  OUR_LOCATION: "At our location",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  SCHEDULED: "default",
  DONE: "success",
  CANCELLED: "destructive",
};

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, user } = await requireOrg();
  const m = await getMeeting(id);
  if (!m) notFound();

  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isCreator = m.createdById === user.id;
  const canEdit = isAdmin || isCreator;

  return (
    <div className="space-y-6">
      <PageHeader
        title={m.title}
        description={`${formatDateTime(m.scheduledAt)} · ${m.durationMin} min`}
        breadcrumbs={
          <Link href="/meetings" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Meetings
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[m.status] ?? "secondary"}>{m.status}</Badge>
            {canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/meetings/${m.id}/edit`}>
                  <Edit className="size-4" /> Edit
                </Link>
              </Button>
            ) : null}
            <MeetingActions meetingId={m.id} status={m.status} canDelete={canEdit} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Where</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {m.locationKind === "ONLINE" ? <Video className="size-4 text-primary" /> : <MapPin className="size-4 text-primary" />}
                <span>{LOCATION_LABEL[m.locationKind]}</span>
              </div>
              {m.locationDetail ? <p className="pl-6 text-muted-foreground">{m.locationDetail}</p> : null}
              {m.meetingUrl ? (
                <a
                  href={m.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-6 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Join link <ExternalLink className="size-3" />
                </a>
              ) : null}
            </CardContent>
          </Card>

          {m.agenda ? (
            <Card>
              <CardHeader>
                <CardTitle>Agenda</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{m.agenda}</p>
              </CardContent>
            </Card>
          ) : null}

          {m.remarks ? (
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{m.remarks}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Attendees ({m.attendees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {m.attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendees yet.</p>
              ) : (
                <ul className="space-y-2">
                  {m.attendees.map((a) => {
                    const u = a.user;
                    const initials = (u.name ?? u.email)
                      .split(/[\s.@]+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("");
                    return (
                      <li key={u.id} className="flex items-center gap-2 rounded-lg border p-2">
                        <Avatar className="size-7">
                          {u.image ? <AvatarImage src={u.image} alt={u.name ?? u.email} /> : null}
                          <AvatarFallback className="text-[10px]">{initials || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="truncate font-medium">{u.name ?? u.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {m.client ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/clients/${m.client.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-accent/30"
                >
                  <p className="font-medium">{m.client.name}</p>
                  {m.client.company ? <p className="text-xs text-muted-foreground">{m.client.company}</p> : null}
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {m.client.email ? (
                      <span className="flex items-center gap-1"><Mail className="size-3" /> {m.client.email}</span>
                    ) : null}
                    {m.client.phone ? (
                      <span className="flex items-center gap-1"><Phone className="size-3" /> {m.client.phone}</span>
                    ) : null}
                  </div>
                </Link>
              </CardContent>
            </Card>
          ) : null}

          {m.project ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/projects/${m.project.id}`} className="block rounded-lg border p-3 transition-colors hover:bg-accent/30">
                  <p className="truncate font-medium">{m.project.name}</p>
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Created by {m.createdBy.name ?? m.createdBy.email} · {timeAgo(m.createdAt)}{" "}
            · {formatDate(m.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
