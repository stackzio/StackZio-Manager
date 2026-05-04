import { prisma } from "@stackzio/db";
import { requireOrg } from "@/server/auth/guards";

export async function getDashboardData() {
  const { org } = await requireOrg();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    activeProjects,
    clientCount,
    paymentsThisMonth,
    outstandingAgg,
    statusBreakdown,
    monthlyRevenue,
    topOutstanding,
    recentActivity,
  ] = await Promise.all([
    prisma.project.count({
      where: { organizationId: org.id, status: { in: ["LEAD", "IN_PROGRESS", "ON_HOLD"] } },
    }),
    prisma.client.count({ where: { organizationId: org.id } }),
    prisma.payment.aggregate({
      where: { organizationId: org.id, paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ outstanding: number }[]>`
      SELECT COALESCE(SUM(p."priceTotal" - COALESCE(paid.total, 0)), 0)::float AS outstanding
      FROM "Project" p
      LEFT JOIN (
        SELECT "projectId", SUM(amount) AS total
        FROM "Payment"
        GROUP BY "projectId"
      ) paid ON paid."projectId" = p.id
      WHERE p."organizationId" = ${org.id}
        AND p.status NOT IN ('COMPLETED', 'CANCELLED')
    `,
    prisma.project.groupBy({
      by: ["status"],
      where: { organizationId: org.id },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ month: Date; total: number }>>`
      SELECT date_trunc('month', "paidAt")::timestamp AS month, SUM(amount)::float AS total
      FROM "Payment"
      WHERE "organizationId" = ${org.id}
        AND "paidAt" >= ${sixMonthsAgo}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<Array<{
      id: string;
      name: string;
      currency: string;
      outstanding: number;
      progressPct: number;
      clientName: string | null;
    }>>`
      SELECT p.id, p.name, p.currency, p."progressPct",
             (p."priceTotal" - COALESCE(paid.total, 0))::float AS outstanding,
             c.name AS "clientName"
      FROM "Project" p
      LEFT JOIN (
        SELECT "projectId", SUM(amount) AS total
        FROM "Payment"
        GROUP BY "projectId"
      ) paid ON paid."projectId" = p.id
      LEFT JOIN "Client" c ON c.id = p."clientId"
      WHERE p."organizationId" = ${org.id}
        AND p.status NOT IN ('COMPLETED', 'CANCELLED')
      ORDER BY outstanding DESC
      LIMIT 5
    `,
    prisma.activityLog.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { id: true, name: true, email: true, image: true } } },
    }),
  ]);

  const revenueMonth = Number(paymentsThisMonth._sum.amount ?? 0);
  const outstanding = outstandingAgg[0]?.outstanding ?? 0;

  // Build a 6-month buckets from sixMonthsAgo to now, fill missing with 0.
  const months: Array<{ key: string; label: string; total: number }> = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = d.toISOString().slice(0, 7);
    months.push({ key, label: d.toLocaleString("en", { month: "short" }), total: 0 });
  }
  for (const r of monthlyRevenue) {
    const key = new Date(r.month).toISOString().slice(0, 7);
    const m = months.find((x) => x.key === key);
    if (m) m.total = Number(r.total);
  }

  return {
    revenueMonth,
    outstanding,
    activeProjects,
    clientCount,
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
    monthlyRevenue: months,
    topOutstanding,
    recentActivity,
    currency: org.defaultCurrency,
  };
}
