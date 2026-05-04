import { prisma } from "@stackzio/db";
import { requireOrg } from "@/server/auth/guards";

export async function listTeam() {
  const { org } = await requireOrg();
  const [members, invites] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: org.id },
      include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.organizationInvite.findMany({
      where: { organizationId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true, email: true } } },
    }),
  ]);
  return { members, invites };
}
