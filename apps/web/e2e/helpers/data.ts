import { PrismaClient } from "@stackzio/db";

let _prisma: PrismaClient | null = null;
function db(): PrismaClient {
  if (_prisma) return _prisma;
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error("DATABASE_URL_TEST not set");
  }
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  _prisma = new PrismaClient();
  return _prisma;
}

/** Truncate all data tables — keeps the schema, removes all rows. */
export async function resetData(): Promise<void> {
  const prisma = db();
  // Order matters because of FKs; cascading delete on Organization handles
  // most descendants, but we also clear top-level User rows.
  await prisma.$transaction([
    prisma.activityLog.deleteMany({}),
    prisma.meetingAttendee.deleteMany({}),
    prisma.meeting.deleteMany({}),
    prisma.task.deleteMany({}),
    prisma.payment.deleteMany({}),
    prisma.projectDoc.deleteMany({}),
    prisma.projectMember.deleteMany({}),
    prisma.project.deleteMany({}),
    prisma.clientContact.deleteMany({}),
    prisma.client.deleteMany({}),
    prisma.organizationInvite.deleteMany({}),
    prisma.organizationMember.deleteMany({}),
    prisma.organization.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.account.deleteMany({}),
    prisma.verificationToken.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
}

export async function findInviteToken(email: string): Promise<string | null> {
  const prisma = db();
  const invite = await prisma.organizationInvite.findFirst({
    where: { email: email.toLowerCase(), acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return invite?.token ?? null;
}

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@stackzio.test`;
}
