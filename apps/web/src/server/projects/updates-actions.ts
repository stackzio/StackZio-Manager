"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, type ProjectUpdateKind } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { emitNotification } from "@/server/notifications/actions";

const UPDATE_KINDS = ["UPDATE", "MILESTONE", "BLOCKER", "ANNOUNCEMENT"] as const;

const postSchema = z.object({
  body: z.string().trim().min(1, "Write something").max(4000),
  kind: z.enum(UPDATE_KINDS).default("UPDATE"),
});

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

export async function postProjectUpdateAction(
  projectId: string,
  input: z.infer<typeof postSchema>,
) {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let context;
  try {
    context = await ensureProjectAccess(projectId);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const { ctx, project } = context;

  const update = await prisma.projectUpdate.create({
    data: {
      projectId: project.id,
      authorId: ctx.user.id,
      kind: parsed.data.kind as ProjectUpdateKind,
      body: parsed.data.body,
    },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "project",
    entityId: project.id,
    action: "update_posted",
    metadata: { updateId: update.id, kind: update.kind },
  });

  // Notify everyone else on the project
  const recipients = new Set<string>([project.ownerId, ...project.members.map((m) => m.userId)]);
  recipients.delete(ctx.user.id);
  for (const userId of recipients) {
    await emitNotification({
      userId,
      organizationId: ctx.org.id,
      kind: "GENERIC",
      title: project.name,
      body: parsed.data.body.slice(0, 140),
      link: `/projects/${project.id}?tab=updates`,
      refEntity: "project",
      refId: project.id,
      dedupeKey: `project_update:${update.id}`,
    });
  }

  revalidatePath(`/projects/${project.id}`);
  return { ok: true as const, updateId: update.id };
}

export async function deleteProjectUpdateAction(updateId: string) {
  const ctx = await requireOrgAction();
  const update = await prisma.projectUpdate.findFirst({
    where: { id: updateId, project: { organizationId: ctx.org.id } },
    include: { project: { include: { members: { select: { userId: true } } } } },
  });
  if (!update) return { ok: false as const, error: "Update not found" };
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  if (!isAdmin && update.authorId !== ctx.user.id) {
    return { ok: false as const, error: "Only the author or admins can delete" };
  }
  await prisma.projectUpdate.delete({ where: { id: updateId } });
  revalidatePath(`/projects/${update.projectId}`);
  return { ok: true as const };
}

const reactionSchema = z.object({ emoji: z.string().trim().min(1).max(8) });

export async function toggleUpdateReactionAction(
  updateId: string,
  input: z.infer<typeof reactionSchema>,
) {
  const ctx = await requireOrgAction();
  const parsed = reactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid emoji" };

  const update = await prisma.projectUpdate.findFirst({
    where: { id: updateId, project: { organizationId: ctx.org.id } },
    include: { project: { include: { members: { select: { userId: true } } } } },
  });
  if (!update) return { ok: false as const, error: "Update not found" };
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isAssigned =
    update.project.ownerId === ctx.user.id || update.project.members.some((m) => m.userId === ctx.user.id);
  if (!isAdmin && !isAssigned) return { ok: false as const, error: "Forbidden" };

  const existing = await prisma.projectUpdateReaction.findUnique({
    where: { updateId_userId_emoji: { updateId, userId: ctx.user.id, emoji: parsed.data.emoji } },
  });
  if (existing) {
    await prisma.projectUpdateReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.projectUpdateReaction.create({
      data: { updateId, userId: ctx.user.id, emoji: parsed.data.emoji },
    });
  }
  revalidatePath(`/projects/${update.projectId}`);
  return { ok: true as const };
}
