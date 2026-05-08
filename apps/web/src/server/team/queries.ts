import { prisma } from "@stackzio/db";
import { requireOrg } from "@/server/auth/guards";

export async function listTeam() {
  const { org } = await requireOrg();
  const [members, invites] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: org.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            // counts for richer member rows on /team
            ownedProjects: { where: { organizationId: org.id }, select: { id: true } },
            projectMembers: {
              where: { project: { organizationId: org.id } },
              select: { projectId: true },
            },
            assignedTasks: {
              where: { organizationId: org.id, status: { not: "DONE" } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.organizationInvite.findMany({
      where: { organizationId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true, email: true } } },
    }),
  ]);

  // Distinct project count per user (own + assigned, dedup'd).
  const enrichedMembers = members.map((m) => {
    const projectIdsSet = new Set<string>([
      ...m.user.ownedProjects.map((p) => p.id),
      ...m.user.projectMembers.map((pm) => pm.projectId),
    ]);
    return {
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        createdAt: m.user.createdAt,
      },
      stats: {
        projectCount: projectIdsSet.size,
        openTaskCount: m.user.assignedTasks.length,
      },
    };
  });

  return { members: enrichedMembers, invites };
}
