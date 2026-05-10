/**
 * Integration tests for finance queries — focused on `getMyEarnings`,
 * which is the only finance read path callable by non-finance users
 * (each user can read their own payouts).
 *
 * Confirms cross-user isolation: signing in as user A returns A's rows
 * only, and switching to B flips the result set.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/server/auth/index", () => ({
  auth: vi.fn(async () => null),
}));

import { Prisma, prisma } from "@stackzio/db";
import { getMyEarnings } from "./queries";
import {
  seedFinanceOrg,
  cleanupFinanceSeed,
  signInAs,
  clearTestSession,
  type FinanceSeed,
} from "../../../tests/helpers/finance-seed";

const { Decimal } = Prisma;

describe("getMyEarnings (integration, real DB)", () => {
  let seed: FinanceSeed;
  // Member A is `seed.member` (MEMBER role); member B is a second user we
  // add into the same org so we can prove cross-user isolation.
  let memberB: { id: string; email: string };

  beforeEach(async () => {
    seed = await seedFinanceOrg();

    // Add a second MEMBER (member B) directly so we don't have to extend
    // the shared seed helper for one test.
    const userB = await prisma.user.create({
      data: {
        email: `member-b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@finance-test.local`,
        name: "Member B",
      },
      select: { id: true, email: true },
    });
    memberB = userB;
    await prisma.organizationMember.create({
      data: {
        organizationId: seed.org.id,
        userId: memberB.id,
        role: "MEMBER",
        canSeeFinancials: false,
      },
    });

    // Create one BONUS payout for each member, distinct amounts so we can
    // tell them apart at assertion time.
    await prisma.payout.createMany({
      data: [
        {
          organizationId: seed.org.id,
          memberUserId: seed.member.id,
          kind: "BONUS",
          amount: new Decimal("111.00"),
          currency: seed.org.defaultCurrency,
          paidAt: new Date("2026-05-01T00:00:00Z"),
          method: "BANK",
          createdById: seed.owner.id,
          note: "for A",
        },
        {
          organizationId: seed.org.id,
          memberUserId: memberB.id,
          kind: "BONUS",
          amount: new Decimal("222.00"),
          currency: seed.org.defaultCurrency,
          paidAt: new Date("2026-05-02T00:00:00Z"),
          method: "BANK",
          createdById: seed.owner.id,
          note: "for B",
        },
      ],
    });
  });

  afterEach(async () => {
    await clearTestSession();
    // Clean up member B's membership + user before the shared cleanup runs.
    await prisma.payout.deleteMany({ where: { memberUserId: memberB.id } });
    await prisma.notification.deleteMany({ where: { userId: memberB.id } });
    await prisma.organizationMember.deleteMany({ where: { userId: memberB.id } });
    await prisma.user.delete({ where: { id: memberB.id } }).catch(() => {});
    await cleanupFinanceSeed(seed);
  });

  it("returns only the signed-in user's payouts (member A)", async () => {
    await signInAs(seed.member.id, seed.org.id);
    const result = await getMyEarnings({});

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.memberUserId).toBe(seed.member.id);
    expect(Number(result.rows[0]!.amount)).toBe(111);
    expect(Number(result.agg._sum.amount ?? 0)).toBe(111);
  });

  it("returns only the signed-in user's payouts (member B)", async () => {
    await signInAs(memberB.id, seed.org.id);
    const result = await getMyEarnings({});

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.memberUserId).toBe(memberB.id);
    expect(Number(result.rows[0]!.amount)).toBe(222);
    expect(Number(result.agg._sum.amount ?? 0)).toBe(222);

    // And member A's row is definitely not visible.
    const aIds = result.rows.filter((r) => r.memberUserId === seed.member.id);
    expect(aIds).toHaveLength(0);
  });
});
