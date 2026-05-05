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

export async function getReceiptData(projectId: string, paymentId: string) {
  const { org, role, user } = await requireOrg();
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, projectId, organizationId: org.id },
    include: {
      project: {
        include: {
          client: true,
          owner: { select: { name: true, email: true } },
          members: { select: { userId: true } },
          payments: { select: { amount: true } },
          organization: true,
        },
      },
    },
  });
  if (!payment) return null;
  if (role === "MEMBER") {
    const allowed =
      payment.project.ownerId === user.id ||
      payment.project.members.some((m) => m.userId === user.id);
    if (!allowed) return null;
  }
  const paid = payment.project.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(payment.project.priceTotal);
  return {
    payment,
    paidTotal: paid,
    priceTotal: total,
    outstanding: Math.max(0, total - paid),
  };
}

export async function getStatementData(projectId: string) {
  const { org, role, user } = await requireOrg();
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.id },
    include: {
      client: true,
      organization: true,
      members: { select: { userId: true } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!project) return null;
  if (role === "MEMBER") {
    const allowed =
      project.ownerId === user.id || project.members.some((m) => m.userId === user.id);
    if (!allowed) return null;
  }
  const paid = project.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const priceTotal = Number(project.priceTotal);
  return {
    project,
    paidTotal: paid,
    priceTotal,
    outstanding: Math.max(0, priceTotal - paid),
  };
}
