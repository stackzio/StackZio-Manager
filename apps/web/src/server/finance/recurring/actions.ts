"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import {
  upsertExpenseRuleSchema,
  type UpsertExpenseRuleInput,
} from "./schemas";
import { computeNextRunAt, materializeRule } from "./materialize";

const { Decimal } = Prisma;

function parseDateOnly(v: string): Date {
  // YYYY-MM-DD → start of day UTC. Consistent with how spentAt is interpreted.
  return new Date(`${v}T00:00:00Z`);
}

export async function createExpenseRuleAction(input: UpsertExpenseRuleInput) {
  const parsed = upsertExpenseRuleSchema.safeParse(input);
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
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Forbidden",
    };
  }

  const cat = await prisma.expenseCategory.findFirst({
    where: { id: parsed.data.categoryId, organizationId: ctx.org.id },
    select: { id: true, name: true },
  });
  if (!cat) return { ok: false as const, error: "Category not found" };

  const startsOn = parseDateOnly(parsed.data.startsOn);
  const endsOn = parsed.data.endsOn ? parseDateOnly(parsed.data.endsOn) : null;

  // First scheduled run = first matching cycle on or after startsOn.
  const nextRunAt = computeNextRunAt(
    {
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth,
      monthOfYear: parsed.data.monthOfYear ?? null,
    },
    startsOn,
  );

  const rule = await prisma.expenseRule.create({
    data: {
      organizationId: ctx.org.id,
      categoryId: cat.id,
      vendor: parsed.data.vendor,
      amount: new Decimal(parsed.data.amount),
      currency: ctx.org.defaultCurrency,
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth,
      monthOfYear:
        parsed.data.frequency === "YEARLY" ? parsed.data.monthOfYear ?? null : null,
      startsOn,
      endsOn,
      active: parsed.data.active,
      nextRunAt,
      createdById: ctx.user.id,
    },
  });

  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: rule.id,
    action: "expense_rule_created",
    metadata: {
      amount: rule.amount.toString(),
      frequency: rule.frequency,
      categoryName: cat.name,
    },
  });

  revalidatePath("/expenses/recurring");
  revalidatePath("/expenses");
  return { ok: true as const, ruleId: rule.id };
}

export async function updateExpenseRuleAction(
  id: string,
  input: UpsertExpenseRuleInput,
) {
  const parsed = upsertExpenseRuleSchema.safeParse(input);
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
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Forbidden",
    };
  }

  const existing = await prisma.expenseRule.findFirst({
    where: { id, organizationId: ctx.org.id },
  });
  if (!existing) return { ok: false as const, error: "Rule not found" };

  const cat = await prisma.expenseCategory.findFirst({
    where: { id: parsed.data.categoryId, organizationId: ctx.org.id },
    select: { id: true },
  });
  if (!cat) return { ok: false as const, error: "Category not found" };

  const startsOn = parseDateOnly(parsed.data.startsOn);
  const endsOn = parsed.data.endsOn ? parseDateOnly(parsed.data.endsOn) : null;
  // Recompute nextRunAt anchored on the LATER of startsOn and (last run + 1ms).
  const anchor =
    existing.lastRunAt && existing.lastRunAt.getTime() > startsOn.getTime()
      ? new Date(existing.lastRunAt.getTime() + 1)
      : startsOn;
  const nextRunAt = computeNextRunAt(
    {
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth,
      monthOfYear: parsed.data.monthOfYear ?? null,
    },
    anchor,
  );

  await prisma.expenseRule.update({
    where: { id },
    data: {
      categoryId: cat.id,
      vendor: parsed.data.vendor,
      amount: new Decimal(parsed.data.amount),
      // currency intentionally locked at creation time
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth,
      monthOfYear:
        parsed.data.frequency === "YEARLY" ? parsed.data.monthOfYear ?? null : null,
      startsOn,
      endsOn,
      active: parsed.data.active,
      nextRunAt,
    },
  });

  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: id,
    action: "expense_rule_updated",
    metadata: { amount: parsed.data.amount, frequency: parsed.data.frequency },
  });

  revalidatePath("/expenses/recurring");
  revalidatePath("/expenses");
  return { ok: true as const };
}

export async function setExpenseRuleActiveAction(id: string, active: boolean) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Forbidden",
    };
  }
  const existing = await prisma.expenseRule.findFirst({
    where: { id, organizationId: ctx.org.id },
  });
  if (!existing) return { ok: false as const, error: "Rule not found" };
  await prisma.expenseRule.update({
    where: { id },
    data: { active },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: id,
    action: active ? "expense_rule_resumed" : "expense_rule_paused",
  });
  revalidatePath("/expenses/recurring");
  return { ok: true as const };
}

export async function deleteExpenseRuleAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Forbidden",
    };
  }
  const existing = await prisma.expenseRule.findFirst({
    where: { id, organizationId: ctx.org.id },
  });
  if (!existing) return { ok: false as const, error: "Rule not found" };
  await prisma.expenseRule.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: id,
    action: "expense_rule_deleted",
    metadata: { amount: existing.amount.toString() },
  });
  revalidatePath("/expenses/recurring");
  revalidatePath("/expenses");
  return { ok: true as const };
}

/**
 * Manually force-run a rule once, regardless of its nextRunAt. Useful from
 * the UI as a "Run now" button when the user wants to test or backfill a
 * missed cycle.
 */
export async function runExpenseRuleNowAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Forbidden",
    };
  }
  const rule = await prisma.expenseRule.findFirst({
    where: { id, organizationId: ctx.org.id },
  });
  if (!rule) return { ok: false as const, error: "Rule not found" };
  // Temporarily treat nextRunAt as now so the materializer fires once.
  const adjusted = { ...rule, nextRunAt: new Date() };
  const res = await materializeRule(adjusted);
  revalidatePath("/expenses/recurring");
  revalidatePath("/expenses");
  revalidatePath("/finance");
  if (!res.created) {
    return { ok: false as const, error: "Rule could not run (ended or paused)" };
  }
  return { ok: true as const, expenseId: res.expenseId! };
}
