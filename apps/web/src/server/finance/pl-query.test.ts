/**
 * Integration test for `getProfitAndLoss` — exercises the full aggregation
 * pipeline against the dev DB. Seeds three payments, two expenses, and one
 * salary payout inside a fixed May 2026 window, then asserts exact Decimal
 * string outputs so any drift in arithmetic surfaces immediately.
 *
 * Math (all INR):
 *   revenue  = 50000 + 30000 + 20000 = 100000
 *   expenses = 8000  + 4000          = 12000
 *   payouts  = 25000                 = 25000
 *   net      = 100000 - 12000 - 25000 = 63000
 *
 * `next/cache` and `next-auth` are mocked the same way the sibling
 * expense-actions / queries tests do it — the test session is pinned via
 * `__setTestSession` through `signInAs`.
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
import { getProfitAndLoss } from "./queries";
import {
  seedFinanceOrg,
  cleanupFinanceSeed,
  signInAs,
  clearTestSession,
  type FinanceSeed,
} from "../../../tests/helpers/finance-seed";

const { Decimal } = Prisma;

describe("getProfitAndLoss (integration, real DB)", () => {
  let seed: FinanceSeed;

  beforeEach(async () => {
    seed = await seedFinanceOrg();
    await signInAs(seed.owner.id, seed.org.id);
  });

  afterEach(async () => {
    await clearTestSession();
    await cleanupFinanceSeed(seed);
  });

  it("matches hand calculation: revenue/expenses/payouts/net", async () => {
    const from = new Date("2026-05-01T00:00:00Z");
    const to = new Date("2026-05-31T23:59:59Z");

    // Three payments inside the window — 50k + 30k + 20k = 100k revenue.
    await prisma.payment.createMany({
      data: [
        {
          organizationId: seed.org.id,
          projectId: seed.project.id,
          amount: new Decimal("50000"),
          paidAt: new Date("2026-05-05T00:00:00Z"),
        },
        {
          organizationId: seed.org.id,
          projectId: seed.project.id,
          amount: new Decimal("30000"),
          paidAt: new Date("2026-05-15T00:00:00Z"),
        },
        {
          organizationId: seed.org.id,
          projectId: seed.project.id,
          amount: new Decimal("20000"),
          paidAt: new Date("2026-05-25T00:00:00Z"),
        },
      ],
    });

    // Two expenses — 8k + 4k = 12k.
    await prisma.expense.createMany({
      data: [
        {
          organizationId: seed.org.id,
          categoryId: seed.category.id,
          amount: new Decimal("8000"),
          currency: "INR",
          spentAt: new Date("2026-05-10T00:00:00Z"),
          createdById: seed.owner.id,
        },
        {
          organizationId: seed.org.id,
          categoryId: seed.category.id,
          amount: new Decimal("4000"),
          currency: "INR",
          spentAt: new Date("2026-05-20T00:00:00Z"),
          createdById: seed.owner.id,
        },
      ],
    });

    // One salary payout — 25k.
    await prisma.payout.createMany({
      data: [
        {
          organizationId: seed.org.id,
          memberUserId: seed.member.id,
          kind: "SALARY",
          amount: new Decimal("25000"),
          currency: "INR",
          periodMonth: new Date(Date.UTC(2026, 4, 1)),
          paidAt: new Date("2026-05-30T00:00:00Z"),
          createdById: seed.owner.id,
        },
      ],
    });

    const pl = await getProfitAndLoss({ from, to });

    // Exact Decimal string equality — drift here is a real arithmetic bug.
    expect(pl.revenue.toString()).toBe("100000");
    expect(pl.expenses.toString()).toBe("12000");
    expect(pl.payouts.toString()).toBe("25000");
    expect(pl.net.toString()).toBe("63000");

    // Sanity checks on shape — these are cheap and catch regressions in
    // the decoration step (joins to category / user / etc.).
    expect(pl.currency).toBe("INR");
    expect(pl.period.from).toEqual(from);
    expect(pl.period.to).toEqual(to);
    expect(pl.monthly).toHaveLength(12);
    expect(pl.byCategory).toHaveLength(1);
    expect(pl.byCategory[0]!.total.toString()).toBe("12000");
    expect(pl.byKind).toHaveLength(1);
    expect(pl.byKind[0]!.kind).toBe("SALARY");
    expect(pl.byKind[0]!.total.toString()).toBe("25000");
    expect(pl.byEarner).toHaveLength(1);
    expect(pl.byEarner[0]!.memberUserId).toBe(seed.member.id);
    expect(pl.byEarner[0]!.total.toString()).toBe("25000");
  });
});
