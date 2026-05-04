import { prisma } from "@stackzio/db";
import { requireOrg } from "@/server/auth/guards";

export interface PaymentListParams {
  q?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export async function listPayments(params: PaymentListParams = {}) {
  const { org, role, user } = await requireOrg();
  const { q, projectId, page = 1, pageSize = 25 } = params;
  const isMember = role === "MEMBER";

  const items = await prisma.payment.findMany({
    where: {
      organizationId: org.id,
      ...(projectId ? { projectId } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q, mode: "insensitive" } },
              { note: { contains: q, mode: "insensitive" } },
              { project: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(isMember
        ? {
            project: {
              OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
            },
          }
        : {}),
    },
    orderBy: { paidAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      project: { select: { id: true, name: true, currency: true, client: { select: { name: true } } } },
    },
  });

  const total = await prisma.payment.count({
    where: {
      organizationId: org.id,
      ...(projectId ? { projectId } : {}),
      ...(isMember
        ? {
            project: {
              OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
            },
          }
        : {}),
    },
  });

  return { items, total, page, pageSize };
}
