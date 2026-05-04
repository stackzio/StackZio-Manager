import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@stackzio/db";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/server/auth/guards";
import { listOrgUsersForAssignment } from "@/server/projects/queries";
import { MeetingForm } from "../_components/meeting-form";

export const metadata: Metadata = { title: "New meeting" };

export default async function NewMeetingPage() {
  const { org } = await requireOrg();
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
        title="New meeting"
        breadcrumbs={
          <Link href="/meetings" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Meetings
          </Link>
        }
      />
      <MeetingForm mode="create" clients={clients} projects={projects} members={members} />
    </div>
  );
}
