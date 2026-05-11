import { PrismaClient } from "@stackzio/db";
import bcrypt from "bcryptjs";

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

export interface SeededOrgRoles {
  orgId: string;
  orgName: string;
  password: string;
  ownerEmail: string;
  adminWithFlagEmail: string;
  adminNoFlagEmail: string;
  memberEmail: string;
}

/**
 * Seed a single org with one of each role/flag combination. Bypasses the
 * invite + signup UI flow so tests start from a clean, deterministic state.
 *
 * All four users share the same password — handy for `login(page, email)`.
 */
export async function seedOrgWithRoles(args: {
  orgName?: string;
  password?: string;
  prefix?: string;
} = {}): Promise<SeededOrgRoles> {
  const prisma = db();
  const password = args.password ?? "TestPass123!";
  const prefix = args.prefix ?? "finance";
  const orgName = args.orgName ?? `Finance Co ${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 8);

  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  const adminWithFlagEmail = uniqueEmail(`${prefix}-adminyes`);
  const adminNoFlagEmail = uniqueEmail(`${prefix}-adminno`);
  const memberEmail = uniqueEmail(`${prefix}-member`);

  const [owner, adminYes, adminNo, member] = await Promise.all([
    prisma.user.create({
      data: { name: "Olive Owner", email: ownerEmail, passwordHash },
    }),
    prisma.user.create({
      data: { name: "Aaron Admin (Finance)", email: adminWithFlagEmail, passwordHash },
    }),
    prisma.user.create({
      data: { name: "Anna Admin (No-Finance)", email: adminNoFlagEmail, passwordHash },
    }),
    prisma.user.create({
      data: { name: "Mira Member", email: memberEmail, passwordHash },
    }),
  ]);

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug: `${prefix}-${Date.now().toString(36)}`,
      timezone: "UTC",
      createdById: owner.id,
      members: {
        create: [
          { userId: owner.id, role: "OWNER", canSeeFinancials: true },
          { userId: adminYes.id, role: "ADMIN", canSeeFinancials: true },
          { userId: adminNo.id, role: "ADMIN", canSeeFinancials: false },
          { userId: member.id, role: "MEMBER", canSeeFinancials: false },
        ],
      },
    },
  });

  // Default expense categories. The product seeds these on first finance use,
  // but seeding here directly keeps the test independent of that logic.
  await prisma.expenseCategory.createMany({
    data: [
      { organizationId: org.id, name: "Software", color: "#6366f1", icon: "code" },
      { organizationId: org.id, name: "Marketing", color: "#f59e0b", icon: "megaphone" },
      { organizationId: org.id, name: "Travel", color: "#10b981", icon: "plane" },
    ],
  });

  return {
    orgId: org.id,
    orgName,
    password,
    ownerEmail,
    adminWithFlagEmail,
    adminNoFlagEmail,
    memberEmail,
  };
}
