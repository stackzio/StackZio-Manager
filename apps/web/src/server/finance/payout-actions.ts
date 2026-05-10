"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { emitNotification } from "@/server/notifications/actions";
import { upsertPayoutSchema, type UpsertPayoutInput } from "./schemas";

const { Decimal } = Prisma;

function parseDate(v: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`);
  return new Date(v);
}

function firstOfMonthUTC(yyyymm: string): Date {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1, 0, 0, 0, 0));
}

export async function createPayoutAction(input: UpsertPayoutInput) {
  const parsed = upsertPayoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }

  // Member must belong to this org.
  const member = await prisma.organizationMember.findFirst({
    where: { organizationId: ctx.org.id, userId: parsed.data.memberUserId },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });
  if (!member) return { ok: false as const, error: "Member not in this organization" };

  // Project (if PROJECT) must belong to this org.
  if (parsed.data.kind === "PROJECT") {
    const p = await prisma.project.findFirst({
      where: { id: parsed.data.projectId!, organizationId: ctx.org.id },
      select: { id: true, name: true },
    });
    if (!p) return { ok: false as const, error: "Project not in this organization" };
  }

  try {
    const payout = await prisma.payout.create({
      data: {
        organizationId: ctx.org.id,
        memberUserId: member.userId,
        kind: parsed.data.kind,
        amount: new Decimal(parsed.data.amount),
        currency: ctx.org.defaultCurrency,
        projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId! : null,
        periodMonth:
          parsed.data.kind === "SALARY" ? firstOfMonthUTC(parsed.data.periodMonth!) : null,
        paidAt: parseDate(parsed.data.paidAt),
        method: parsed.data.method,
        reference: parsed.data.reference,
        note: parsed.data.note,
        createdById: ctx.user.id,
      },
    });

    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "payout",
      entityId: payout.id,
      action: "payout_recorded",
      metadata: {
        amount: payout.amount.toString(),
        kind: payout.kind,
        memberUserId: member.userId,
      },
    });

    await emitNotification({
      userId: member.userId,
      organizationId: ctx.org.id,
      kind: "GENERIC",
      title: `You received a ${parsed.data.kind.toLowerCase()} payout`,
      body: `${ctx.org.defaultCurrency} ${parsed.data.amount}`,
      link: "/my-earnings",
      refEntity: "payout",
      refId: payout.id,
      dedupeKey: `payout-recorded:${payout.id}`,
    });

    revalidatePath("/payouts");
    revalidatePath("/finance");
    revalidatePath("/my-earnings");
    return { ok: true as const, payoutId: payout.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const fields = (e.meta?.target as string[] | undefined) ?? [];
      if (fields.includes("periodMonth")) {
        return {
          ok: false as const,
          error: "Salary for this month already recorded for this member",
        };
      }
    }
    return { ok: false as const, error: "Could not record payout" };
  }
}

export async function updatePayoutAction(id: string, input: UpsertPayoutInput) {
  const parsed = upsertPayoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.payout.findFirst({
    where: { id, organizationId: ctx.org.id },
  });
  if (!existing) return { ok: false as const, error: "Not found" };

  try {
    await prisma.payout.update({
      where: { id },
      data: {
        memberUserId: parsed.data.memberUserId,
        kind: parsed.data.kind,
        amount: new Decimal(parsed.data.amount),
        projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId! : null,
        periodMonth:
          parsed.data.kind === "SALARY" ? firstOfMonthUTC(parsed.data.periodMonth!) : null,
        paidAt: parseDate(parsed.data.paidAt),
        method: parsed.data.method,
        reference: parsed.data.reference,
        note: parsed.data.note,
      },
    });
    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "payout",
      entityId: id,
      action: "payout_updated",
      metadata: { amount: parsed.data.amount, kind: parsed.data.kind },
    });
    revalidatePath("/payouts");
    revalidatePath("/finance");
    revalidatePath("/my-earnings");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false as const,
        error: "Salary for that month is already recorded",
      };
    }
    return { ok: false as const, error: "Could not update payout" };
  }
}

export async function deletePayoutAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.payout.findFirst({
    where: { id, organizationId: ctx.org.id },
  });
  if (!existing) return { ok: false as const, error: "Not found" };
  await prisma.payout.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "payout",
    entityId: id,
    action: "payout_deleted",
    metadata: { amount: existing.amount.toString(), kind: existing.kind },
  });
  revalidatePath("/payouts");
  revalidatePath("/finance");
  revalidatePath("/my-earnings");
  return { ok: true as const };
}

export async function repeatLastMonthSalariesAction(args: {
  picks: Array<{ memberUserId: string; amount: string }>;
  forMonth: string; // YYYY-MM
  paidAt: string; // YYYY-MM-DD
}) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (args.picks.length === 0) {
    return { ok: false as const, error: "Nothing selected" };
  }
  const periodMonth = firstOfMonthUTC(args.forMonth);
  const paidAt = parseDate(args.paidAt);

  let created: Array<{ id: string; memberUserId: string; amount: Prisma.Decimal }>;
  try {
    created = await prisma.$transaction(
      args.picks.map((p) =>
        prisma.payout.create({
          data: {
            organizationId: ctx.org.id,
            memberUserId: p.memberUserId,
            kind: "SALARY",
            amount: new Decimal(p.amount),
            currency: ctx.org.defaultCurrency,
            periodMonth,
            paidAt,
            method: "BANK",
            createdById: ctx.user.id,
            note: "Repeated from last month",
          },
          select: { id: true, memberUserId: true, amount: true },
        }),
      ),
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false as const,
        error:
          "One or more selected members already have a salary recorded for this month — uncheck them",
      };
    }
    return { ok: false as const, error: "Could not record payouts" };
  }

  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "organization",
    entityId: ctx.org.id,
    action: "payouts_bulk_repeated",
    metadata: { count: created.length, forMonth: args.forMonth },
  });

  await Promise.all(
    created.map((p) =>
      emitNotification({
        userId: p.memberUserId,
        organizationId: ctx.org.id,
        kind: "GENERIC",
        title: "Salary payout recorded",
        body: `${ctx.org.defaultCurrency} ${p.amount.toString()}`,
        link: "/my-earnings",
        refEntity: "payout",
        refId: p.id,
        dedupeKey: `payout-recorded:${p.id}`,
      }),
    ),
  );

  revalidatePath("/payouts");
  revalidatePath("/finance");
  revalidatePath("/my-earnings");
  return { ok: true as const, count: created.length };
}
