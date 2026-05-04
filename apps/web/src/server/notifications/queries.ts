import { prisma } from "@stackzio/db";
import { requireUserAction } from "@/server/auth/guards";
import { sweepNotifications } from "./sweep";

export async function getMyNotifications(opts: { sweep?: boolean; take?: number } = {}) {
  const user = await requireUserAction();
  if (opts.sweep) {
    try {
      await sweepNotifications(user.id);
    } catch (e) {
      // Sweep is best-effort — never fail the request because of it.
      console.warn("[notifications] sweep failed", e);
    }
  }
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      take: opts.take ?? 30,
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);
  return { items, unread };
}

export async function getMyUnreadCount(): Promise<number> {
  const user = await requireUserAction();
  return prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
}
