"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { upsertMeetingSchema, type UpsertMeetingInput } from "./schemas";

export type MeetingResult = { ok: true; meetingId: string } | { ok: false; error: string };

async function validateRefs(orgId: string, clientId?: string, projectId?: string) {
  if (clientId) {
    const c = await prisma.client.findFirst({ where: { id: clientId, organizationId: orgId } });
    if (!c) return "Client not found in this organization";
  }
  if (projectId) {
    const p = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } });
    if (!p) return "Project not found in this organization";
  }
  return null;
}

async function validAttendees(orgId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const memberships = await prisma.organizationMember.findMany({
    where: { organizationId: orgId, userId: { in: ids } },
  });
  return memberships.map((m) => m.userId);
}

export async function createMeetingAction(input: UpsertMeetingInput): Promise<MeetingResult> {
  const ctx = await requireOrgAction();
  const parsed = upsertMeetingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const refErr = await validateRefs(ctx.org.id, data.clientId, data.projectId);
  if (refErr) return { ok: false, error: refErr };

  const validIds = await validAttendees(ctx.org.id, data.attendeeIds);

  const meeting = await prisma.$transaction(async (tx) => {
    const created = await tx.meeting.create({
      data: {
        organizationId: ctx.org.id,
        createdById: ctx.user.id,
        title: data.title,
        clientId: data.clientId,
        projectId: data.projectId,
        scheduledAt: data.scheduledAt,
        durationMin: data.durationMin,
        locationKind: data.locationKind,
        locationDetail: data.locationDetail,
        meetingUrl: data.meetingUrl,
        agenda: data.agenda,
        remarks: data.remarks,
        status: data.status,
        attendees: validIds.length
          ? { create: validIds.map((userId) => ({ userId })) }
          : undefined,
      },
    });
    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "meeting",
      entityId: created.id,
      action: "created",
      metadata: { title: created.title, scheduledAt: data.scheduledAt.toISOString() },
    });
    return created;
  });

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  return { ok: true, meetingId: meeting.id };
}

export async function updateMeetingAction(id: string, input: UpsertMeetingInput): Promise<MeetingResult> {
  const ctx = await requireOrgAction();
  const parsed = upsertMeetingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const existing = await prisma.meeting.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: { attendees: { select: { userId: true } } },
  });
  if (!existing) return { ok: false, error: "Meeting not found" };

  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isCreator = existing.createdById === ctx.user.id;
  if (!isAdmin && !isCreator) return { ok: false, error: "You can only edit meetings you created" };

  const refErr = await validateRefs(ctx.org.id, data.clientId, data.projectId);
  if (refErr) return { ok: false, error: refErr };

  const validIds = new Set(await validAttendees(ctx.org.id, data.attendeeIds));
  const current = new Set(existing.attendees.map((a) => a.userId));
  const toAdd = [...validIds].filter((u) => !current.has(u));
  const toRemove = [...current].filter((u) => !validIds.has(u));

  await prisma.$transaction(async (tx) => {
    await tx.meeting.update({
      where: { id },
      data: {
        title: data.title,
        clientId: data.clientId,
        projectId: data.projectId,
        scheduledAt: data.scheduledAt,
        durationMin: data.durationMin,
        locationKind: data.locationKind,
        locationDetail: data.locationDetail,
        meetingUrl: data.meetingUrl,
        agenda: data.agenda,
        remarks: data.remarks,
        status: data.status,
      },
    });
    if (toRemove.length) {
      await tx.meetingAttendee.deleteMany({ where: { meetingId: id, userId: { in: toRemove } } });
    }
    if (toAdd.length) {
      await tx.meetingAttendee.createMany({
        data: toAdd.map((userId) => ({ meetingId: id, userId })),
      });
    }
    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "meeting",
      entityId: id,
      action: "updated",
      metadata: { title: data.title },
    });
  });

  revalidatePath("/meetings");
  revalidatePath(`/meetings/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, meetingId: id };
}

export async function deleteMeetingAction(id: string) {
  const ctx = await requireOrgAction();
  const existing = await prisma.meeting.findFirst({
    where: { id, organizationId: ctx.org.id },
    select: { id: true, title: true, createdById: true },
  });
  if (!existing) return { ok: false as const, error: "Meeting not found" };
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  if (!isAdmin && existing.createdById !== ctx.user.id) {
    return { ok: false as const, error: "You can only delete meetings you created" };
  }
  await prisma.meeting.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "meeting",
    entityId: id,
    action: "deleted",
    metadata: { title: existing.title },
  });
  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function setMeetingStatusAction(id: string, status: "SCHEDULED" | "DONE" | "CANCELLED") {
  const ctx = await requireOrgAction();
  const existing = await prisma.meeting.findFirst({
    where: { id, organizationId: ctx.org.id },
    select: { id: true, createdById: true, attendees: { select: { userId: true } } },
  });
  if (!existing) return { ok: false as const, error: "Meeting not found" };
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isCreator = existing.createdById === ctx.user.id;
  const isAttendee = existing.attendees.some((a) => a.userId === ctx.user.id);
  if (!isAdmin && !isCreator && !isAttendee) {
    return { ok: false as const, error: "Forbidden" };
  }
  await prisma.meeting.update({ where: { id }, data: { status } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "meeting",
    entityId: id,
    action: `status_${status.toLowerCase()}`,
  });
  revalidatePath("/meetings");
  revalidatePath(`/meetings/${id}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}
