import { redirect } from "next/navigation";
import { prisma } from "@stackzio/db";
import type { Prisma, ClientInterest } from "@stackzio/db";
import { canSeeProjectFinancials, requireOrg } from "@/server/auth/guards";

export interface ClientListParams {
  q?: string;
  sort?: "name" | "createdAt" | "company" | "followUpAt";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  status?: ClientInterest;
  due?: "overdue" | "week";
}

/**
 * MEMBER role doesn't see clients at all — they live behind the same gate as
 * financials. Use canSeeProjectFinancials() for both. Server-side redirect so direct
 * URL hits also bounce back to /dashboard.
 */
function gateClientAccess(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (!canSeeProjectFinancials(role)) redirect("/dashboard");
}

function dueWindow(due: ClientListParams["due"]): Prisma.ClientWhereInput | undefined {
  if (!due) return undefined;
  const now = new Date();
  if (due === "overdue") return { followUpAt: { lt: now } };
  // "week" = within next 7 days (inclusive of overdue, since user is triaging)
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { followUpAt: { lte: inSevenDays, not: null } };
}

export async function listClients(params: ClientListParams = {}) {
  const { org, role } = await requireOrg();
  gateClientAccess(role);
  const { q, sort = "name", dir = "asc", page = 1, pageSize = 25, status, due } = params;

  const where: Prisma.ClientWhereInput = {
    organizationId: org.id,
    ...(status ? { interestStatus: status } : {}),
    ...(dueWindow(due) ?? {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ClientOrderByWithRelationInput =
    sort === "followUpAt" ? { followUpAt: { sort: dir, nulls: "last" } } : { [sort]: dir };

  const [items, total, statusCounts] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { projects: true, contacts: true } },
      },
    }),
    prisma.client.count({ where }),
    prisma.client.groupBy({
      by: ["interestStatus"],
      where: { organizationId: org.id },
      _count: { _all: true },
    }),
  ]);

  return { items, total, page, pageSize, sort, dir, statusCounts };
}

export async function getClient(id: string) {
  const { org, role } = await requireOrg();
  gateClientAccess(role);
  return prisma.client.findFirst({
    where: { id, organizationId: org.id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { payments: true, tasks: true } },
        },
      },
      meetings: {
        orderBy: { scheduledAt: "desc" },
        take: 5,
      },
      discussionNotes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });
}
