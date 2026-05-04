import { prisma } from "@stackzio/db";
import { requireSuperAdmin } from "@/server/auth/guards";

export async function getAdminOverview() {
  await requireSuperAdmin();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    superAdminCount,
    orgCount,
    activeOrgsLast7d,
    projectCount,
    activeProjectCount,
    paymentSum30d,
    recentSignups,
    topOrgs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isSuperAdmin: true } }),
    prisma.organization.count(),
    prisma.organization.count({
      where: { activityLogs: { some: { createdAt: { gte: sevenDaysAgo } } } },
    }),
    prisma.project.count(),
    prisma.project.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, image: true, createdAt: true, isSuperAdmin: true },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        _count: { select: { members: true, projects: true, clients: true } },
      },
    }),
  ]);

  return {
    userCount,
    superAdminCount,
    orgCount,
    activeOrgsLast7d,
    projectCount,
    activeProjectCount,
    paymentSumThisMonth: Number(paymentSum30d._sum.amount ?? 0),
    recentSignups,
    topOrgs,
  };
}

export async function listAllOrganizations(args: { q?: string; page?: number; pageSize?: number } = {}) {
  await requireSuperAdmin();
  const { q, page = 1, pageSize = 25 } = args;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
          { contactEmail: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, projects: true, clients: true, payments: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listAllUsers(args: { q?: string; page?: number; pageSize?: number } = {}) {
  await requireSuperAdmin();
  const { q, page = 1, pageSize = 25 } = args;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { memberships: true, ownedProjects: true, meetingsCreated: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getOrganizationDetail(id: string) {
  await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: {
        select: {
          members: true,
          clients: true,
          projects: true,
          payments: true,
          meetings: true,
          activityLogs: true,
        },
      },
    },
  });
  if (!org) return null;
  const paymentSum = await prisma.payment.aggregate({
    where: { organizationId: id },
    _sum: { amount: true },
  });
  return { ...org, totalPayments: Number(paymentSum._sum.amount ?? 0) };
}

export async function getUserDetail(id: string) {
  await requireSuperAdmin();
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      },
      _count: { select: { ownedProjects: true, meetingsCreated: true, projectMembers: true } },
    },
  });
  return user;
}
