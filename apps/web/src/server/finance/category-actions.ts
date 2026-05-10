"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";
import { upsertCategorySchema, type UpsertCategoryInput } from "./schemas";

export async function createCategoryAction(input: UpsertCategoryInput) {
  const parsed = upsertCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  try {
    const cat = await prisma.expenseCategory.create({
      data: {
        organizationId: ctx.org.id,
        name: parsed.data.name,
        color: parsed.data.color,
        icon: parsed.data.icon,
        isSystem: false,
      },
    });
    revalidatePath("/expenses/categories");
    return { ok: true as const, categoryId: cat.id };
  } catch {
    return { ok: false as const, error: "A category with that name already exists" };
  }
}

export async function updateCategoryAction(id: string, input: UpsertCategoryInput) {
  const parsed = upsertCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const cat = await prisma.expenseCategory.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!cat) return { ok: false as const, error: "Category not found" };
  // System categories: only color/icon may change, name stays
  await prisma.expenseCategory.update({
    where: { id },
    data: cat.isSystem
      ? { color: parsed.data.color, icon: parsed.data.icon }
      : { name: parsed.data.name, color: parsed.data.color, icon: parsed.data.icon },
  });
  revalidatePath("/expenses/categories");
  return { ok: true as const };
}

export async function deleteCategoryAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const cat = await prisma.expenseCategory.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: { _count: { select: { expenses: true } } },
  });
  if (!cat) return { ok: false as const, error: "Not found" };
  if (cat.isSystem) return { ok: false as const, error: "System categories can't be deleted" };
  if (cat._count.expenses > 0) {
    return { ok: false as const, error: `In use by ${cat._count.expenses} expenses — reassign first` };
  }
  await prisma.expenseCategory.delete({ where: { id } });
  revalidatePath("/expenses/categories");
  return { ok: true as const };
}
