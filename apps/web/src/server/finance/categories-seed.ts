import type { Prisma } from "@stackzio/db";

export const SYSTEM_CATEGORIES: Array<Omit<Prisma.ExpenseCategoryCreateManyInput, "organizationId">> = [
  { name: "Ads",         color: "#ec4899", icon: "Megaphone", isSystem: true },
  { name: "Influencer",  color: "#a855f7", icon: "Users",     isSystem: true },
  { name: "Marketing",   color: "#6366f1", icon: "Sparkles",  isSystem: true },
  { name: "Software",    color: "#06b6d4", icon: "Code2",     isSystem: true },
  { name: "Rent",        color: "#f59e0b", icon: "Building2", isSystem: true },
  { name: "Travel",      color: "#10b981", icon: "Plane",     isSystem: true },
  { name: "Other",       color: "#71717a", icon: "Tag",       isSystem: true },
];

export async function seedSystemExpenseCategories(
  tx: { expenseCategory: { createMany: (args: { data: Prisma.ExpenseCategoryCreateManyInput[]; skipDuplicates?: boolean }) => Promise<unknown> } },
  organizationId: string,
) {
  await tx.expenseCategory.createMany({
    data: SYSTEM_CATEGORIES.map((c) => ({ ...c, organizationId })),
    skipDuplicates: true,
  });
}
