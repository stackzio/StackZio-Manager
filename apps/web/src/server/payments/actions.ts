"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireAdminAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { emitNotification } from "@/server/notifications/actions";
import { upsertPaymentSchema, type UpsertPaymentInput } from "./schemas";

export type PaymentResult = { ok: true; paymentId: string } | { ok: false; error: string };

export async function createPaymentAction(projectId: string, input: UpsertPaymentInput): Promise<PaymentResult> {
  const ctx = await requireAdminAction();
  const parsed = upsertPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.org.id },
    select: {
      id: true,
      name: true,
      ownerId: true,
      members: { select: { userId: true } },
    },
  });
  if (!project) return { ok: false, error: "Project not found" };

  const payment = await prisma.payment.create({
    data: {
      organizationId: ctx.org.id,
      projectId,
      amount: data.amount,
      kind: data.kind,
      method: data.method,
      paidAt: data.paidAt,
      reference: data.reference,
      note: data.note,
    },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "payment",
    entityId: payment.id,
    action: "created",
    metadata: { projectId, amount: data.amount, kind: data.kind },
  });

  // Notify the project owner + members (excluding the actor). Fire in
  // parallel — sequential await on N recipients was dominating latency.
  const recipients = new Set<string>([
    project.ownerId,
    ...project.members.map((m) => m.userId),
  ]);
  recipients.delete(ctx.user.id);
  await Promise.allSettled(
    Array.from(recipients).map((userId) =>
      emitNotification({
        userId,
        organizationId: ctx.org.id,
        kind: "PAYMENT_RECORDED",
        title: "Payment recorded",
        body: `${data.kind} of ${data.amount} on "${project.name}"`,
        link: `/projects/${projectId}`,
        refEntity: "payment",
        refId: payment.id,
        dedupeKey: `payment:created:${payment.id}`,
      }),
    ),
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  return { ok: true, paymentId: payment.id };
}

export async function deletePaymentAction(id: string) {
  const ctx = await requireAdminAction();
  const existing = await prisma.payment.findFirst({
    where: { id, organizationId: ctx.org.id },
    select: { id: true, projectId: true, amount: true },
  });
  if (!existing) return { ok: false as const, error: "Payment not found" };
  await prisma.payment.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "payment",
    entityId: id,
    action: "deleted",
    metadata: { projectId: existing.projectId, amount: existing.amount.toString() },
  });
  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
