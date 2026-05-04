import type { Prisma } from "@stackzio/db";
import { prisma } from "@stackzio/db";
import { requireOrg } from "@/server/auth/guards";

export interface ProjectListParams {
  q?: string;
  status?: string;
  category?: string;
  memberId?: string;
  clientId?: string;
  sort?: "name" | "createdAt" | "deadline" | "priceTotal";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listProjects(params: ProjectListParams = {}) {
  const { org, role, user } = await requireOrg();
  const {
    q,
    status,
    category,
    memberId,
    clientId,
    sort = "createdAt",
    dir = "desc",
    page = 1,
    pageSize = 25,
  } = params;

  const isMember = role === "MEMBER";

  const where: Prisma.ProjectWhereInput = {
    organizationId: org.id,
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(status ? { status: status as Prisma.EnumProjectStatusFilter["equals"] } : {}),
    ...(category ? { category: category as Prisma.EnumProjectCategoryFilter["equals"] } : {}),
    ...(clientId ? { clientId } : {}),
    ...(memberId
      ? { OR: [{ ownerId: memberId }, { members: { some: { userId: memberId } } }] }
      : {}),
    ...(isMember
      ? {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { id: true, name: true, company: true } },
        owner: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { tasks: true, members: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const enriched = items.map((p) => {
    const paid = p.payments.reduce((sum, x) => sum + Number(x.amount), 0);
    const total = Number(p.priceTotal);
    const outstanding = Math.max(0, total - paid);
    return { ...p, paid, outstanding };
  });

  return { items: enriched, total, page, pageSize, sort, dir };
}

export async function getProject(id: string) {
  const { org, role, user } = await requireOrg();
  const project = await prisma.project.findFirst({
    where: { id, organizationId: org.id },
    include: {
      client: true,
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      payments: { orderBy: { paidAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      docs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;

  // For MEMBER role, only allow access if assigned (or owner).
  if (role === "MEMBER") {
    const assigned =
      project.ownerId === user.id || project.members.some((m) => m.userId === user.id);
    if (!assigned) return null;
  }

  const paid = project.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(project.priceTotal);
  const outstanding = Math.max(0, total - paid);
  return { ...project, paid, outstanding };
}

export async function listOrgUsersForAssignment() {
  const { org } = await requireOrg();
  const memberships = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
  return memberships.map((m) => ({ ...m.user, role: m.role }));
}

export async function listOrgClientsForSelect() {
  const { org } = await requireOrg();
  return prisma.client.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  });
}
