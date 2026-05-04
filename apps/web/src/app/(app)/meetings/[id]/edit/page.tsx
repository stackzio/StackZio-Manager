import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@stackzio/db";
import { PageHeader } from "@/components/page-header";
import { getMeeting } from "@/server/meetings/queries";
import { listOrgUsersForAssignment } from "@/server/projects/queries";
import { MeetingForm } from "../../_components/meeting-form";
import { requireOrg } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Edit meeting" };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
}

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, role, user } = await requireOrg();
  const m = await getMeeting(id);
  if (!m) notFound();

  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isCreator = m.createdById === user.id;
  if (!isAdmin && !isCreator) notFound();

  const [clients, projects, members] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listOrgUsersForAssignment(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit ${m.title}`}
        breadcrumbs={
          <Link href={`/meetings/${m.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Back to meeting
          </Link>
        }
      />
      <MeetingForm
        mode="edit"
        meetingId={m.id}
        clients={clients}
        projects={projects}
        members={members}
        initial={{
          title: m.title,
          clientId: m.clientId ?? undefined,
          projectId: m.projectId ?? undefined,
          scheduledAt: m.scheduledAt.toISOString(),
          scheduledAtLocal: toLocalInput(m.scheduledAt),
          durationMin: m.durationMin,
          locationKind: m.locationKind,
          locationDetail: m.locationDetail ?? undefined,
          meetingUrl: m.meetingUrl ?? undefined,
          agenda: m.agenda ?? undefined,
          remarks: m.remarks ?? undefined,
          status: m.status,
          attendeeIds: m.attendees.map((a) => a.userId),
        }}
      />
    </div>
  );
}
