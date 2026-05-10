/**
 * Finance test seed helpers.
 *
 * Spin up a real Organization + memberships in the dev DB so server actions
 * (which call requireOrgFinance and write rows) can be exercised with real
 * Prisma writes. Tests must call `cleanup(seed)` (or similar) after each
 * case to remove the rows they created — there is currently no separate
 * test DB, so we never call `migrate reset`.
 */

import { prisma } from "@stackzio/db";
import { __setTestSession } from "@/server/auth/guards";
import { seedSystemExpenseCategories } from "@/server/finance/categories-seed";

export type FinanceSeed = {
  org: { id: string; defaultCurrency: string; timezone: string };
  owner: { id: string; email: string };
  adminWithFlag: { id: string; email: string };
  adminNoFlag: { id: string; email: string };
  member: { id: string; email: string };
  project: { id: string };
  client: { id: string };
  category: { id: string; name: string };
};

let counter = 0;
function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createUser(role: string): Promise<{ id: string; email: string }> {
  const email = `${role}-${uniq("u")}@finance-test.local`;
  const u = await prisma.user.create({
    data: { email, name: `Test ${role}` },
    select: { id: true, email: true },
  });
  return u;
}

export async function seedFinanceOrg(): Promise<FinanceSeed> {
  const owner = await createUser("owner");

  const org = await prisma.organization.create({
    data: {
      slug: uniq("org"),
      name: `Test Org ${uniq("n")}`,
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
      createdById: owner.id,
    },
    select: { id: true, defaultCurrency: true, timezone: true },
  });

  const adminWithFlag = await createUser("admin-yes");
  const adminNoFlag = await createUser("admin-no");
  const member = await createUser("member");

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: owner.id, role: "OWNER", canSeeFinancials: true },
      { organizationId: org.id, userId: adminWithFlag.id, role: "ADMIN", canSeeFinancials: true },
      { organizationId: org.id, userId: adminNoFlag.id, role: "ADMIN", canSeeFinancials: false },
      { organizationId: org.id, userId: member.id, role: "MEMBER", canSeeFinancials: false },
    ],
  });

  await seedSystemExpenseCategories(prisma, org.id);
  // Pull "Other" out as the default category for tests
  const category = await prisma.expenseCategory.findFirstOrThrow({
    where: { organizationId: org.id, name: "Other" },
    select: { id: true, name: true },
  });

  // A client is required for a Project; build a minimal one.
  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: `Test Client ${uniq("c")}`,
      createdById: owner.id,
    },
    select: { id: true },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: `Test Project ${uniq("p")}`,
      clientId: client.id,
      ownerId: owner.id,
      currency: org.defaultCurrency,
    },
    select: { id: true },
  });

  return { org, owner, adminWithFlag, adminNoFlag, member, project, client, category };
}

/**
 * Pin the active session for the duration of one test.
 * Calls into the test-only override exposed by `guards.ts`.
 */
export async function signInAs(userId: string, orgId: string): Promise<void> {
  __setTestSession({ userId, orgId });
}

export async function clearTestSession(): Promise<void> {
  __setTestSession(null);
}

/**
 * Tear down everything `seedFinanceOrg` created plus any expenses/payouts/
 * activity logs the test under it generated.
 *
 * Cascade-safe order: payout → expense → category → project → member → user → org.
 * The Organization onDelete: Cascade will handle most of this, but we delete
 * defensively in case the cascade graph misses something.
 */
export async function cleanupFinanceSeed(seed: FinanceSeed): Promise<void> {
  const userIds = [
    seed.owner.id,
    seed.adminWithFlag.id,
    seed.adminNoFlag.id,
    seed.member.id,
  ];
  // Activity logs reference users + orgs and would block user deletes.
  await prisma.activityLog.deleteMany({ where: { organizationId: seed.org.id } });
  // Payout notifications get emitted to test users; clean defensively in case
  // a future test produces a notification with a null organizationId (the
  // org-cascade wouldn't reach those, and they would block user deletes).
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { organizationId: seed.org.id },
        { userId: { in: userIds } },
      ],
    },
  });
  await prisma.payout.deleteMany({ where: { organizationId: seed.org.id } });
  await prisma.expense.deleteMany({ where: { organizationId: seed.org.id } });
  await prisma.expenseCategory.deleteMany({ where: { organizationId: seed.org.id } });
  await prisma.project.deleteMany({ where: { organizationId: seed.org.id } });
  await prisma.client.deleteMany({ where: { organizationId: seed.org.id } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: seed.org.id } });
  await prisma.organization.delete({ where: { id: seed.org.id } }).catch(() => {});
  // Now safe to drop the test users.
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
