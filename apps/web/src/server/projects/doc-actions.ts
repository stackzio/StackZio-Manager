"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";

const linkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  url: z.string().trim().url(),
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

export async function addProjectDocLinkAction(
  projectId: string,
  input: z.infer<typeof linkSchema>,
) {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let context;
  try {
    context = await ensureProjectAccess(projectId);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const { ctx, project } = context;

  const doc = await prisma.projectDoc.create({
    data: {
      projectId: project.id,
      title: parsed.data.title,
      url: parsed.data.url,
      kind: "LINK",
      uploadedById: ctx.user.id,
    },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "project",
    entityId: project.id,
    action: "doc_linked",
    metadata: { docId: doc.id, title: doc.title },
  });
  revalidatePath(`/projects/${project.id}`);
  return { ok: true as const, docId: doc.id };
}

export async function deleteProjectDocAction(docId: string) {
  const ctx = await requireOrgAction();
  const doc = await prisma.projectDoc.findFirst({
    where: { id: docId, project: { organizationId: ctx.org.id } },
    include: { project: { include: { members: { select: { userId: true } } } } },
  });
  if (!doc) return { ok: false as const, error: "Doc not found" };
  const isAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isAssigned =
    doc.project.ownerId === ctx.user.id || doc.project.members.some((m) => m.userId === ctx.user.id);
  if (!isAdmin && !isAssigned) return { ok: false as const, error: "Forbidden" };

  await prisma.projectDoc.delete({ where: { id: docId } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "project",
    entityId: doc.projectId,
    action: "doc_deleted",
    metadata: { docId, title: doc.title },
  });
  revalidatePath(`/projects/${doc.projectId}`);
  return { ok: true as const };
}
