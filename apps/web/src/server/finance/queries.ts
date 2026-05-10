import { cache } from "react";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrg, requireOrgFinance, requireUserAction } from "@/server/auth/guards";

export interface ListExpensesArgs {
  from?: Date;
  to?: Date;
  categoryIds?: string[];
  vendorQuery?: string;
  cursor?: string;
  take?: number;
}

export async function listExpenses(args: ListExpensesArgs = {}) {
  const ctx = await requireOrgFinance();
  const where: Prisma.ExpenseWhereInput = {
    organizationId: ctx.org.id,
    ...(args.from || args.to ? { spentAt: { gte: args.from, lte: args.to } } : {}),
    ...(args.categoryIds?.length ? { categoryId: { in: args.categoryIds } } : {}),
    ...(args.vendorQuery
      ? { vendor: { contains: args.vendorQuery, mode: "insensitive" } }
      : {}),
  };
  const rows = await prisma.expense.findMany({
    where,
    orderBy: { spentAt: "desc" },
    take: args.take ?? 50,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    include: { category: true },
  });
  return rows;
}

export interface ListPayoutsArgs {
  from?: Date;
  to?: Date;
  memberUserIds?: string[];
  kinds?: Array<"SALARY" | "PROJECT" | "BONUS">;
  projectId?: string;
  cursor?: string;
  take?: number;
}

export async function listPayouts(args: ListPayoutsArgs = {}) {
  const ctx = await requireOrgFinance();
  const where: Prisma.PayoutWhereInput = {
    organizationId: ctx.org.id,
    ...(args.from || args.to ? { paidAt: { gte: args.from, lte: args.to } } : {}),
    ...(args.memberUserIds?.length ? { memberUserId: { in: args.memberUserIds } } : {}),
    ...(args.kinds?.length ? { kind: { in: args.kinds } } : {}),
    ...(args.projectId ? { projectId: args.projectId } : {}),
  };
  const rows = await prisma.payout.findMany({
    where,
    orderBy: { paidAt: "desc" },
    take: args.take ?? 50,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    include: {
      member: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
    },
  });
  return rows;
}

export const listCategories = cache(async () => {
  const ctx = await requireOrg();
  return prisma.expenseCategory.findMany({
    where: { organizationId: ctx.org.id },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
});

export async function getMyEarnings(args: { from?: Date; to?: Date }) {
  const user = await requireUserAction();
  const where: Prisma.PayoutWhereInput = {
    memberUserId: user.id,
    ...(args.from || args.to ? { paidAt: { gte: args.from, lte: args.to } } : {}),
  };
  const [rows, agg, byKind, byMonth, byProject] = await Promise.all([
    prisma.payout.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: 200,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.payout.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.payout.groupBy({ by: ["kind"], where, _sum: { amount: true } }),
    // Last 6 months window — UI buckets by month from raw rows.
    prisma.payout.findMany({
      where: { memberUserId: user.id, paidAt: { gte: sixMonthsAgo() } },
      select: { paidAt: true, amount: true },
    }),
    prisma.payout.groupBy({
      by: ["projectId"],
      where: { memberUserId: user.id, projectId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);
  return { rows, agg, byKind, byMonth, byProject };
}

function sixMonthsAgo(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d;
}
