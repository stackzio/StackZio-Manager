"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { tagOrgClients } from "@/server/cache";
import { upsertClientSchema, type UpsertClientInput } from "./schemas";

export type ClientResult =
  | { ok: true; clientId: string }
  | { ok: false; error: string };

export async function createClientAction(input: UpsertClientInput): Promise<ClientResult> {
  const ctx = await requireOrgAction();
  const parsed = upsertClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const created = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        organizationId: ctx.org.id,
        createdById: ctx.user.id,
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        website: data.website,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        notes: data.notes,
        interestStatus: data.interestStatus,
        followUpAt: data.followUpAt ?? null,
        followUpReason: data.followUpReason,
        contacts: data.contacts.length
          ? { create: data.contacts.map((c) => ({ name: c.name, role: c.role, email: c.email, phone: c.phone })) }
          : undefined,
      },
    });
    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "client",
      entityId: client.id,
      action: "created",
      metadata: { name: client.name },
    });
    return client;
  });

  revalidatePath("/clients");
  revalidateTag(tagOrgClients(ctx.org.id));
  return { ok: true, clientId: created.id };
}

export async function updateClientAction(
  id: string,
  input: UpsertClientInput,
): Promise<ClientResult> {
  const ctx = await requireOrgAction();
  const parsed = upsertClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Verify the client belongs to the active org.
  const existing = await prisma.client.findFirst({
    where: { id, organizationId: ctx.org.id },
    select: { id: true, createdById: true },
  });
  if (!existing) return { ok: false, error: "Client not found" };

  // Members can only edit clients they created. Admins/Owners can edit any.
  if (ctx.role === "MEMBER" && existing.createdById !== ctx.user.id) {
    return { ok: false, error: "You can only edit clients you created" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id },
      data: {
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        website: data.website,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        notes: data.notes,
        interestStatus: data.interestStatus,
        followUpAt: data.followUpAt ?? null,
        followUpReason: data.followUpReason,
      },
    });

    // Naive replace strategy for contacts: delete missing, upsert provided.
    const incomingIds = data.contacts.filter((c) => c.id).map((c) => c.id!);
    await tx.clientContact.deleteMany({
      where: { clientId: id, ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}) },
    });
    for (const c of data.contacts) {
      if (c.id) {
        await tx.clientContact.update({
          where: { id: c.id },
          data: { name: c.name, role: c.role, email: c.email, phone: c.phone },
        });
      } else {
        await tx.clientContact.create({
          data: { clientId: id, name: c.name, role: c.role, email: c.email, phone: c.phone },
        });
      }
    }

    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "client",
      entityId: id,
      action: "updated",
      metadata: { name: data.name },
    });
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidateTag(tagOrgClients(ctx.org.id));
  return { ok: true, clientId: id };
}

export async function deleteClientAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireOrgAction(["OWNER", "ADMIN"]);
  const existing = await prisma.client.findFirst({
    where: { id, organizationId: ctx.org.id },
    select: { id: true, name: true, _count: { select: { projects: true } } },
  });
  if (!existing) return { ok: false, error: "Client not found" };
  if (existing._count.projects > 0) {
    return { ok: false, error: "Cannot delete a client that still has projects. Delete or reassign the projects first." };
  }
  await prisma.client.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "client",
    entityId: id,
    action: "deleted",
    metadata: { name: existing.name },
  });
  revalidatePath("/clients");
  revalidateTag(tagOrgClients(ctx.org.id));
  return { ok: true };
}
