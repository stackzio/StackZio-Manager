import { prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";

export async function listExpenseRules() {
  const ctx = await requireOrgFinance();
  return prisma.expenseRule.findMany({
    where: { organizationId: ctx.org.id },
    orderBy: [{ active: "desc" }, { nextRunAt: "asc" }],
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      _count: { select: { expenses: true } },
    },
  });
}

export async function getExpenseRule(id: string) {
  const ctx = await requireOrgFinance();
  return prisma.expenseRule.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
}
