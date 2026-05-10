import { cache } from "react";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrg, requireOrgFinance, requireUserAction } from "@/server/auth/guards";

const { Decimal } = Prisma;

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

export interface PLResult {
  period: { from: Date; to: Date };
  currency: string;
  revenue: Prisma.Decimal;
  expenses: Prisma.Decimal;
  payouts: Prisma.Decimal;
  net: Prisma.Decimal;
  byCategory: Array<{ categoryId: string; name: string; color: string; icon: string; total: Prisma.Decimal }>;
  byKind: Array<{ kind: "SALARY" | "PROJECT" | "BONUS"; total: Prisma.Decimal }>;
  byVendor: Array<{ vendor: string | null; total: Prisma.Decimal }>;
  byEarner: Array<{ memberUserId: string; name: string | null; image: string | null; total: Prisma.Decimal }>;
  monthly: Array<{ month: string; revenue: Prisma.Decimal; outflow: Prisma.Decimal }>;
  prev: { revenue: Prisma.Decimal; expenses: Prisma.Decimal; payouts: Prisma.Decimal; net: Prisma.Decimal };
}

export async function getProfitAndLoss(period: { from: Date; to: Date }): Promise<PLResult> {
  const ctx = await requireOrgFinance();
  const orgId = ctx.org.id;
  const { from, to } = period;

  const [revAgg, expAgg, payAgg, byCat, byKindRows, byVendor, byEarnerRows] = await Promise.all([
    prisma.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { organizationId: orgId, spentAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { organizationId: orgId, paidAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { organizationId: orgId, spentAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.payout.groupBy({
      by: ["kind"],
      where: { organizationId: orgId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["vendor"],
      where: { organizationId: orgId, spentAt: { gte: from, lte: to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.payout.groupBy({
      by: ["memberUserId"],
      where: { organizationId: orgId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);

  const revenue = new Decimal(revAgg._sum.amount ?? 0);
  const expenses = new Decimal(expAgg._sum.amount ?? 0);
  const payouts = new Decimal(payAgg._sum.amount ?? 0);
  const net = revenue.minus(expenses).minus(payouts);

  // Decorate category rows
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: byCat.map((c) => c.categoryId) } },
    select: { id: true, name: true, color: true, icon: true },
  });
  const byCategory = byCat.map((c) => {
    const m = categories.find((x) => x.id === c.categoryId)!;
    return { categoryId: c.categoryId, name: m.name, color: m.color, icon: m.icon, total: new Decimal(c._sum.amount ?? 0) };
  });

  const earners = await prisma.user.findMany({
    where: { id: { in: byEarnerRows.map((e) => e.memberUserId) } },
    select: { id: true, name: true, image: true },
  });
  const byEarner = byEarnerRows.map((e) => {
    const u = earners.find((x) => x.id === e.memberUserId);
    return { memberUserId: e.memberUserId, name: u?.name ?? null, image: u?.image ?? null, total: new Decimal(e._sum.amount ?? 0) };
  });

  // Monthly trend — last 12 months irrespective of selected period
  const trendFrom = startOfMonthUTC(addMonthsUTC(new Date(), -11));
  const [payTrend, expTrend, outTrend] = await Promise.all([
    prisma.payment.findMany({ where: { organizationId: orgId, paidAt: { gte: trendFrom } }, select: { paidAt: true, amount: true } }),
    prisma.expense.findMany({ where: { organizationId: orgId, spentAt: { gte: trendFrom } }, select: { spentAt: true, amount: true } }),
    prisma.payout.findMany({ where: { organizationId: orgId, paidAt: { gte: trendFrom } }, select: { paidAt: true, amount: true } }),
  ]);
  const monthly = buildMonthlyTrend(payTrend, expTrend, outTrend);

  // Prev period (same length, immediately before)
  const len = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - len - 1);
  const prevTo = new Date(from.getTime() - 1);
  const [prevRev, prevExp, prevPay] = await Promise.all([
    prisma.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { organizationId: orgId, spentAt: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { organizationId: orgId, paidAt: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
  ]);
  const prevRevD = new Decimal(prevRev._sum.amount ?? 0);
  const prevExpD = new Decimal(prevExp._sum.amount ?? 0);
  const prevPayD = new Decimal(prevPay._sum.amount ?? 0);

  return {
    period,
    currency: ctx.org.defaultCurrency,
    revenue,
    expenses,
    payouts,
    net,
    byCategory,
    byKind: byKindRows.map((k) => ({ kind: k.kind, total: new Decimal(k._sum.amount ?? 0) })),
    byVendor: byVendor.map((v) => ({ vendor: v.vendor, total: new Decimal(v._sum.amount ?? 0) })),
    byEarner,
    monthly,
    prev: {
      revenue: prevRevD,
      expenses: prevExpD,
      payouts: prevPayD,
      net: prevRevD.minus(prevExpD).minus(prevPayD),
    },
  };
}

export function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function addMonthsUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function buildMonthlyTrend(
  payments: Array<{ paidAt: Date; amount: Prisma.Decimal }>,
  expenses: Array<{ spentAt: Date; amount: Prisma.Decimal }>,
  payouts: Array<{ paidAt: Date; amount: Prisma.Decimal }>,
) {
  const map = new Map<string, { revenue: Prisma.Decimal; outflow: Prisma.Decimal }>();
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = addMonthsUTC(today, -i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    map.set(key, { revenue: new Decimal(0), outflow: new Decimal(0) });
  }
  for (const p of payments) {
    const k = `${p.paidAt.getUTCFullYear()}-${String(p.paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const slot = map.get(k);
    if (slot) slot.revenue = slot.revenue.plus(p.amount);
  }
  for (const e of expenses) {
    const k = `${e.spentAt.getUTCFullYear()}-${String(e.spentAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const slot = map.get(k);
    if (slot) slot.outflow = slot.outflow.plus(e.amount);
  }
  for (const o of payouts) {
    const k = `${o.paidAt.getUTCFullYear()}-${String(o.paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const slot = map.get(k);
    if (slot) slot.outflow = slot.outflow.plus(o.amount);
  }
  return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
}
