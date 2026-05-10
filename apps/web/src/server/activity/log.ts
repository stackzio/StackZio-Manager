import type { Prisma } from "@stackzio/db";
import { prisma } from "@stackzio/db";

export async function logActivity(args: {
  organizationId: string;
  actorId: string;
  entity:
    | "organization"
    | "client"
    | "project"
    | "payment"
    | "task"
    | "meeting"
    | "team"
    | "user"
    | "expense"
    | "category"
    | "payout";
  entityId: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.activityLog.create({
    data: {
      organizationId: args.organizationId,
      actorId: args.actorId,
      entity: args.entity,
      entityId: args.entityId,
      action: args.action,
      metadata: args.metadata,
    },
  });
}
