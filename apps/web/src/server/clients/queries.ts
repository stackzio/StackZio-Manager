import { redirect } from "next/navigation";
import { prisma } from "@stackzio/db";
import type { Prisma } from "@stackzio/db";
import { canSeeProjectFinancials, requireOrg } from "@/server/auth/guards";

export interface ClientListParams {
  q?: string;
  sort?: "name" | "createdAt" | "company";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * MEMBER role doesn't see clients at all — they live behind the same gate as
 * financials. Use canSeeProjectFinancials() for both. Server-side redirect so direct
 * URL hits also bounce back to /dashboard.
 */
function gateClientAccess(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (!canSeeProjectFinancials(role)) redirect("/dashboard");
}

export async function listClients(params: ClientListParams = {}) {
  const { org, role } = await requireOrg();
  gateClientAccess(role);
  const { q, sort = "name", dir = "asc", page = 1, pageSize = 25 } = params;

  const where: Prisma.ClientWhereInput = {
    organizationId: org.id,
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

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { projects: true, contacts: true } },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return { items, total, page, pageSize, sort, dir };
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
    },
  });
}
