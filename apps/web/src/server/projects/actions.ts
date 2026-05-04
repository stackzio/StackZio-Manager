"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireAdminAction, requireOrgAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { upsertProjectSchema, upsertTaskSchema, type UpsertProjectInput, type UpsertTaskInput } from "./schemas";

export type ProjectResult = { ok: true; projectId: string } | { ok: false; error: string };

export async function createProjectAction(input: UpsertProjectInput): Promise<ProjectResult> {
  const ctx = await requireAdminAction();
  const parsed = upsertProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Verify client + owner belong to org.
  const [client, ownerMembership] = await Promise.all([
    prisma.client.findFirst({ where: { id: data.clientId, organizationId: ctx.org.id } }),
    prisma.organizationMember.findFirst({ where: { organizationId: ctx.org.id, userId: data.ownerId } }),
  ]);
  if (!client) return { ok: false, error: "Client does not belong to this organization" };
  if (!ownerMembership) return { ok: false, error: "Owner is not a member of this organization" };

  const memberRows = data.memberIds.length
    ? await prisma.organizationMember.findMany({
        where: { organizationId: ctx.org.id, userId: { in: data.memberIds } },
      })
    : [];
  const validMemberIds = new Set(memberRows.map((m) => m.userId));

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        organizationId: ctx.org.id,
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        ownerId: data.ownerId,
        category: data.category,
        status: data.status,
        priceTotal: data.priceTotal,
        currency: data.currency,
        startDate: data.startDate,
        deadline: data.deadline,
        progressPct: data.progressPct,
      },
    });
    if (validMemberIds.size > 0) {
      await tx.projectMember.createMany({
        data: Array.from(validMemberIds).map((userId) => ({
          projectId: created.id,
          userId,
        })),
      });
    }
    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "project",
      entityId: created.id,
      action: "created",
      metadata: { name: created.name, priceTotal: data.priceTotal },
    });
    return created;
  });

  revalidatePath("/projects");
  return { ok: true, projectId: project.id };
}

export async function updateProjectAction(
  id: string,
  input: UpsertProjectInput,
): Promise<ProjectResult> {
  const ctx = await requireOrgAction();
  const parsed = upsertProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: { members: { select: { userId: true } } },
  });
  if (!existing) return { ok: false, error: "Project not found" };

  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isAssigned =
    existing.ownerId === ctx.user.id || existing.members.some((m) => m.userId === ctx.user.id);

  if (!isAdmin && !isAssigned) {
    return { ok: false, error: "You don't have access to edit this project" };
  }

  // Members can edit non-financial, non-assignment fields only.
  const memberAllowed: Partial<typeof data> = {
    name: data.name,
    description: data.description,
    status: data.status,
    progressPct: data.progressPct,
    deadline: data.deadline,
    startDate: data.startDate,
    category: data.category,
  };
  const fields = isAdmin ? data : memberAllowed;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        name: fields.name,
        description: fields.description,
        category: fields.category,
        status: fields.status,
        startDate: fields.startDate,
        deadline: fields.deadline,
        progressPct: fields.progressPct,
        ...(isAdmin
          ? {
              clientId: data.clientId,
              ownerId: data.ownerId,
              priceTotal: data.priceTotal,
              currency: data.currency,
              ...(data.status === "COMPLETED" && !existing.completedAt
                ? { completedAt: new Date() }
                : {}),
              ...(data.status !== "COMPLETED" && existing.completedAt
                ? { completedAt: null }
                : {}),
            }
          : {}),
      },
    });

    if (isAdmin) {
      const requested = new Set(data.memberIds);
      const current = new Set(existing.members.map((m) => m.userId));
      const toAdd = [...requested].filter((u) => !current.has(u));
      const toRemove = [...current].filter((u) => !requested.has(u));

      if (toRemove.length) {
        await tx.projectMember.deleteMany({ where: { projectId: id, userId: { in: toRemove } } });
      }
      if (toAdd.length) {
        const valid = await tx.organizationMember.findMany({
          where: { organizationId: ctx.org.id, userId: { in: toAdd } },
        });
        if (valid.length) {
          await tx.projectMember.createMany({
            data: valid.map((m) => ({ projectId: id, userId: m.userId })),
          });
        }
      }
    }

    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "project",
      entityId: id,
      action: "updated",
      metadata: { fields: Object.keys(fields) },
    });
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true, projectId: id };
}

export async function deleteProjectAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdminAction();
  const existing = await prisma.project.findFirst({
    where: { id, organizationId: ctx.org.id },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: false, error: "Project not found" };
  await prisma.project.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "project",
    entityId: id,
    action: "deleted",
    metadata: { name: existing.name },
  });
  revalidatePath("/projects");
  return { ok: true };
}

// Tasks
export type TaskResult = { ok: true; taskId: string } | { ok: false; error: string };

async function ensureProjectAccess(projectId: string) {
  const ctx = await requireOrgAction();
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.org.id },
    include: { members: { select: { userId: true } } },
  });
  if (!project) throw new Error("Project not found");
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isAssigned = project.ownerId === ctx.user.id || project.members.some((m) => m.userId === ctx.user.id);
  if (!isAdmin && !isAssigned) throw new Error("Forbidden");
  return { ctx, project };
}

export async function createTaskAction(projectId: string, input: UpsertTaskInput): Promise<TaskResult> {
  let context;
  try {
    context = await ensureProjectAccess(projectId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const { ctx, project } = context;
  const parsed = upsertTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  if (data.assigneeId) {
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: ctx.org.id, userId: data.assigneeId },
    });
    if (!member) return { ok: false, error: "Assignee is not a member of this organization" };
  }

  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      organizationId: ctx.org.id,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      status: data.status,
      dueDate: data.dueDate,
    },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "task",
    entityId: task.id,
    action: "created",
    metadata: { projectId: project.id, title: task.title },
  });
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, taskId: task.id };
}

export async function setTaskStatusAction(taskId: string, status: "TODO" | "DOING" | "DONE") {
  const ctx = await requireOrgAction();
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: ctx.org.id },
    include: { project: { include: { members: true } } },
  });
  if (!task) return { ok: false as const, error: "Task not found" };
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isAssigned =
    task.project.ownerId === ctx.user.id || task.project.members.some((m) => m.userId === ctx.user.id);
  if (!isAdmin && !isAssigned) return { ok: false as const, error: "Forbidden" };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "task",
    entityId: taskId,
    action: `status_${status.toLowerCase()}`,
    metadata: { projectId: task.projectId },
  });
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true as const };
}

export async function deleteTaskAction(taskId: string) {
  const ctx = await requireOrgAction();
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: ctx.org.id },
    include: { project: { include: { members: true } } },
  });
  if (!task) return { ok: false as const, error: "Task not found" };
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isAssigned =
    task.project.ownerId === ctx.user.id || task.project.members.some((m) => m.userId === ctx.user.id);
  if (!isAdmin && !isAssigned) return { ok: false as const, error: "Forbidden" };

  await prisma.task.delete({ where: { id: taskId } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "task",
    entityId: taskId,
    action: "deleted",
    metadata: { projectId: task.projectId },
  });
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true as const };
}
