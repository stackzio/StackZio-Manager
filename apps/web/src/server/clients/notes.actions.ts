"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { tagOrgClients } from "@/server/cache";
import {
  addClientNoteSchema,
  updateClientNoteSchema,
  deleteClientNoteSchema,
} from "./schemas";

type AddResult = { ok: true; noteId: string } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

function canModifyNote(
  role: "OWNER" | "ADMIN" | "MEMBER",
  authorId: string,
  userId: string,
) {
  return role === "OWNER" || role === "ADMIN" || authorId === userId;
}

function revalidateClient(orgId: string, clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidateTag(tagOrgClients(orgId));
}

export async function addClientNoteAction(input: {
  clientId: string;
  body: string;
  kind: "NOTE" | "CALL" | "EMAIL" | "MEETING" | "WHATSAPP";
}): Promise<AddResult> {
  const ctx = await requireOrgAction();
  const parsed = addClientNoteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { clientId, body, kind } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: ctx.org.id },
    select: { id: true, name: true },
  });
  if (!client) return { ok: false, error: "Client not found" };

  const note = await prisma.clientNote.create({
    data: { clientId, authorId: ctx.user.id, body, kind },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "client",
    entityId: clientId,
    action: "note_added",
    metadata: { name: client.name, kind },
  });
  revalidateClient(ctx.org.id, clientId);
  return { ok: true, noteId: note.id };
}

export async function updateClientNoteAction(input: {
  id: string;
  body: string;
  kind: "NOTE" | "CALL" | "EMAIL" | "MEETING" | "WHATSAPP";
}): Promise<Result> {
  const ctx = await requireOrgAction();
  const parsed = updateClientNoteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, body, kind } = parsed.data;

  const note = await prisma.clientNote.findFirst({
    where: { id, client: { organizationId: ctx.org.id } },
    select: { id: true, authorId: true, client: { select: { id: true } } },
  });
  if (!note) return { ok: false, error: "Note not found" };
  if (!canModifyNote(ctx.role, note.authorId, ctx.user.id)) {
    return { ok: false, error: "Not allowed" };
  }

  await prisma.clientNote.update({ where: { id }, data: { body, kind } });
  revalidateClient(ctx.org.id, note.client.id);
  return { ok: true };
}

export async function deleteClientNoteAction(input: { id: string }): Promise<Result> {
  const ctx = await requireOrgAction();
  const parsed = deleteClientNoteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id } = parsed.data;

  const note = await prisma.clientNote.findFirst({
    where: { id, client: { organizationId: ctx.org.id } },
    select: { id: true, authorId: true, client: { select: { id: true } } },
  });
  if (!note) return { ok: false, error: "Note not found" };
  if (!canModifyNote(ctx.role, note.authorId, ctx.user.id)) {
    return { ok: false, error: "Not allowed" };
  }

  await prisma.clientNote.delete({ where: { id } });
  revalidateClient(ctx.org.id, note.client.id);
  return { ok: true };
}
