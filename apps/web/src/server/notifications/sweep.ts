import { prisma, type NotificationKind } from "@stackzio/db";

interface NotificationSeed {
  userId: string;
  organizationId: string | null;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
  refEntity?: string;
  refId?: string;
  dedupeKey: string;
}

/**
 * Idempotent sweep that materialises state-based notifications for the given user
 * across every org they're a member of:
 *   - Meetings within the next 24 hours
 *   - Meetings within the next 1 hour
 *   - Active projects past their deadline
 *   - Active projects with deadline within 3 days
 *   - Tasks (assigned to them) due in 24h or overdue
 *
 * Safe to call repeatedly; uses (userId, dedupeKey) as a unique key.
 */
export async function sweepNotifications(userId: string): Promise<void> {
  const now = new Date();
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  if (memberships.length === 0) return;
  const orgIds = memberships.map((m) => m.organizationId);

  const seeds: NotificationSeed[] = [];

  // ---- Meetings ----
  const meetings = await prisma.meeting.findMany({
    where: {
      organizationId: { in: orgIds },
      status: "SCHEDULED",
      scheduledAt: { gte: now, lte: in24h },
      OR: [
        { createdById: userId },
        { attendees: { some: { userId } } },
      ],
    },
    select: { id: true, organizationId: true, title: true, scheduledAt: true },
  });
  for (const m of meetings) {
    const minsUntil = Math.round((m.scheduledAt.getTime() - now.getTime()) / 60000);
    if (m.scheduledAt <= in1h) {
      seeds.push({
        userId,
        organizationId: m.organizationId,
        kind: "MEETING_SOON",
        title: `Meeting in ${minsUntil} min`,
        body: m.title,
        link: `/meetings/${m.id}`,
        refEntity: "meeting",
        refId: m.id,
        dedupeKey: `meeting:soon:${m.id}`,
      });
    } else {
      seeds.push({
        userId,
        organizationId: m.organizationId,
        kind: "MEETING_TOMORROW",
        title: "Meeting tomorrow",
        body: m.title,
        link: `/meetings/${m.id}`,
        refEntity: "meeting",
        refId: m.id,
        dedupeKey: `meeting:tomorrow:${m.id}`,
      });
    }
  }

  // ---- Projects: overdue + deadline near (admin/owner sees all; member sees assigned) ----
  for (const m of memberships) {
    const isAdmin = m.role === "OWNER" || m.role === "ADMIN";
    const projects = await prisma.project.findMany({
      where: {
        organizationId: m.organizationId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        deadline: { not: null },
        ...(isAdmin
          ? {}
          : {
              OR: [{ ownerId: userId }, { members: { some: { userId } } }],
            }),
      },
      select: { id: true, organizationId: true, name: true, deadline: true },
    });
    for (const p of projects) {
      if (!p.deadline) continue;
      if (p.deadline < now) {
        const days = Math.ceil((now.getTime() - p.deadline.getTime()) / (24 * 60 * 60 * 1000));
        seeds.push({
          userId,
          organizationId: p.organizationId,
          kind: "PROJECT_OVERDUE",
          title: `Project overdue by ${days}d`,
          body: p.name,
          link: `/projects/${p.id}`,
          refEntity: "project",
          refId: p.id,
          dedupeKey: `project:overdue:${p.id}:${p.deadline.toISOString().slice(0, 10)}`,
        });
      } else if (p.deadline <= in3d) {
        const days = Math.max(0, Math.ceil((p.deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        seeds.push({
          userId,
          organizationId: p.organizationId,
          kind: "PROJECT_DEADLINE_NEAR",
          title: `Deadline in ${days}d`,
          body: p.name,
          link: `/projects/${p.id}`,
          refEntity: "project",
          refId: p.id,
          dedupeKey: `project:deadline_near:${p.id}:${p.deadline.toISOString().slice(0, 10)}`,
        });
      }
    }
  }

  // ---- Tasks assigned to me ----
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { not: "DONE" },
      dueDate: { not: null, lte: in24h },
    },
    select: { id: true, organizationId: true, projectId: true, title: true, dueDate: true },
  });
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const overdue = t.dueDate < now;
    seeds.push({
      userId,
      organizationId: t.organizationId,
      kind: overdue ? "TASK_OVERDUE" : "TASK_DUE_SOON",
      title: overdue ? "Task overdue" : "Task due soon",
      body: t.title,
      link: `/projects/${t.projectId}`,
      refEntity: "task",
      refId: t.id,
      dedupeKey: `task:${overdue ? "overdue" : "due_soon"}:${t.id}:${t.dueDate.toISOString().slice(0, 10)}`,
    });
  }

  if (seeds.length === 0) return;

  // Batch upsert via createMany with skipDuplicates against the
  // unique (userId, dedupeKey) constraint.
  await prisma.notification.createMany({
    data: seeds,
    skipDuplicates: true,
  });
}
