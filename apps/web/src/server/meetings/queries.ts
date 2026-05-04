import { prisma } from "@stackzio/db";
import type { Prisma } from "@stackzio/db";
import { requireOrg } from "@/server/auth/guards";

export interface MeetingListParams {
  q?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function listMeetings(params: MeetingListParams = {}) {
  const { org, role, user } = await requireOrg();
  const { q, status, from, to, page = 1, pageSize = 50 } = params;
  const isMember = role === "MEMBER";

  const where: Prisma.MeetingWhereInput = {
    organizationId: org.id,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(status ? { status: status as Prisma.EnumMeetingStatusFilter["equals"] } : {}),
    ...(from || to
      ? {
          scheduledAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(isMember
      ? {
          OR: [
            { createdById: user.id },
            { attendees: { some: { userId: user.id } } },
            { project: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        attendees: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    }),
    prisma.meeting.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getMeeting(id: string) {
  const { org, role, user } = await requireOrg();
  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId: org.id },
    include: {
      client: { select: { id: true, name: true, company: true, email: true, phone: true } },
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, image: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });
  if (!meeting) return null;
  if (role === "MEMBER") {
    const allowed =
      meeting.createdById === user.id ||
      meeting.attendees.some((a) => a.userId === user.id);
    if (!allowed) return null;
  }
  return meeting;
}

export async function listUpcomingMeetings(days = 7) {
  const { org, role, user } = await requireOrg();
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return prisma.meeting.findMany({
    where: {
      organizationId: org.id,
      scheduledAt: { gte: now, lte: horizon },
      status: "SCHEDULED",
      ...(role === "MEMBER"
        ? {
            OR: [
              { createdById: user.id },
              { attendees: { some: { userId: user.id } } },
            ],
          }
        : {}),
    },
    orderBy: { scheduledAt: "asc" },
    take: 6,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
}
