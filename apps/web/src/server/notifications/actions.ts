"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireUserAction } from "@/server/auth/guards";
import { sweepNotifications } from "./sweep";

export async function markNotificationReadAction(id: string) {
  const user = await requireUserAction();
  const n = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) return { ok: false as const, error: "Not found" };
  if (!n.readAt) {
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }
  return { ok: true as const };
}

export async function markAllNotificationsReadAction() {
  const user = await requireUserAction();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function dismissNotificationAction(id: string) {
  const user = await requireUserAction();
  await prisma.notification.deleteMany({ where: { id, userId: user.id } });
  return { ok: true as const };
}

/** Server-action wrapper around the sweep — used by the bell when opened. */
export async function sweepMyNotificationsAction() {
  const user = await requireUserAction();
  await sweepNotifications(user.id);
  return { ok: true as const };
}

/** Helper used by other modules to materialise an event-style notification. */
export async function emitNotification(args: {
  userId: string;
  organizationId: string | null;
  kind: Parameters<typeof prisma.notification.create>[0]["data"]["kind"];
  title: string;
  body?: string;
  link?: string;
  refEntity?: string;
  refId?: string;
  dedupeKey: string;
}) {
  await prisma.notification.upsert({
    where: { userId_dedupeKey: { userId: args.userId, dedupeKey: args.dedupeKey } },
    create: {
      userId: args.userId,
      organizationId: args.organizationId,
      kind: args.kind,
      title: args.title,
      body: args.body,
      link: args.link,
      refEntity: args.refEntity,
      refId: args.refId,
      dedupeKey: args.dedupeKey,
    },
    update: {
      title: args.title,
      body: args.body,
      link: args.link,
    },
  });
}
