"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { upsertExpenseSchema, type UpsertExpenseInput } from "./schemas";

const { Decimal } = Prisma;

function parseDate(v: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`);
  return new Date(v);
}

export async function createExpenseAction(input: UpsertExpenseInput) {
  const parsed = upsertExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }

  // Confirm category belongs to this org
  const cat = await prisma.expenseCategory.findFirst({
    where: { id: parsed.data.categoryId, organizationId: ctx.org.id },
    select: { id: true, name: true },
  });
  if (!cat) return { ok: false as const, error: "Category not found" };

  const expense = await prisma.expense.create({
    data: {
      organizationId: ctx.org.id,
      categoryId: cat.id,
      vendor: parsed.data.vendor,
      amount: new Decimal(parsed.data.amount),
      currency: ctx.org.defaultCurrency,
      spentAt: parseDate(parsed.data.spentAt),
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      receiptUrl: parsed.data.receiptUrl,
      createdById: ctx.user.id,
    },
  });

  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: expense.id,
    action: "expense_recorded",
    metadata: { amount: expense.amount.toString(), categoryId: cat.id, categoryName: cat.name },
  });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  return { ok: true as const, expenseId: expense.id };
}

export async function updateExpenseAction(id: string, input: UpsertExpenseInput) {
  const parsed = upsertExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.expense.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!existing) return { ok: false as const, error: "Expense not found" };

  const cat = await prisma.expenseCategory.findFirst({
    where: { id: parsed.data.categoryId, organizationId: ctx.org.id },
    select: { id: true },
  });
  if (!cat) return { ok: false as const, error: "Category not found" };

  await prisma.expense.update({
    where: { id },
    data: {
      categoryId: cat.id,
      vendor: parsed.data.vendor,
      amount: new Decimal(parsed.data.amount),
      // currency intentionally NOT updated
      spentAt: parseDate(parsed.data.spentAt),
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      receiptUrl: parsed.data.receiptUrl,
    },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: id,
    action: "expense_updated",
    metadata: { amount: parsed.data.amount },
  });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  return { ok: true as const };
}

export async function deleteExpenseAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.expense.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!existing) return { ok: false as const, error: "Not found" };
  await prisma.expense.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: id,
    action: "expense_deleted",
    metadata: { amount: existing.amount.toString() },
  });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  return { ok: true as const };
}
