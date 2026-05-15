"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { tagOrgClients } from "@/server/cache";
import {
  updateClientInterestSchema,
  updateClientFollowUpSchema,
} from "./schemas";

type Result = { ok: true } | { ok: false; error: string };

async function loadOwnedClient(clientId: string, orgId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true, name: true },
  });
}

function revalidate(orgId: string, clientId: string) {
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidateTag(tagOrgClients(orgId));
}

export async function updateClientInterestAction(input: {
  clientId: string;
  interestStatus: string;
}): Promise<Result> {
  const ctx = await requireOrgAction();
  const parsed = updateClientInterestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { clientId, interestStatus } = parsed.data;
  const client = await loadOwnedClient(clientId, ctx.org.id);
  if (!client) return { ok: false, error: "Client not found" };
  await prisma.client.update({ where: { id: clientId }, data: { interestStatus } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "client",
    entityId: clientId,
    action: "interest_changed",
    metadata: { name: client.name, interestStatus },
  });
  revalidate(ctx.org.id, clientId);
  return { ok: true };
}

export async function updateClientFollowUpAction(input: {
  clientId: string;
  followUpAt: Date | null;
  followUpReason?: string;
}): Promise<Result> {
  const ctx = await requireOrgAction();
  const parsed = updateClientFollowUpSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { clientId, followUpAt, followUpReason } = parsed.data;
  const client = await loadOwnedClient(clientId, ctx.org.id);
  if (!client) return { ok: false, error: "Client not found" };
  await prisma.client.update({
    where: { id: clientId },
    data: { followUpAt, followUpReason: followUpReason ?? null },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "client",
    entityId: clientId,
    action: followUpAt ? "follow_up_scheduled" : "follow_up_cleared",
    metadata: { name: client.name, followUpAt: followUpAt?.toISOString() ?? null },
  });
  revalidate(ctx.org.id, clientId);
  return { ok: true };
}

export async function markFollowUpDoneAction(clientId: string): Promise<Result> {
  const ctx = await requireOrgAction();
  const client = await loadOwnedClient(clientId, ctx.org.id);
  if (!client) return { ok: false, error: "Client not found" };
  await prisma.client.update({
    where: { id: clientId },
    data: { followUpAt: null, followUpReason: null },
  });
  await prisma.clientNote.create({
    data: { clientId, authorId: ctx.user.id, body: "Follow-up completed", kind: "NOTE" },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "client",
    entityId: clientId,
    action: "follow_up_done",
    metadata: { name: client.name },
  });
  revalidate(ctx.org.id, clientId);
  return { ok: true };
}
