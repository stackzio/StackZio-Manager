/**
 * Integration tests for payout server actions.
 *
 * Same harness as `expense-actions.test.ts` — runs against the dev DB,
 * mocks `next/cache` (no Next request scope under Vitest), and pins the
 * active session via `__setTestSession`. Each case cleans up via
 * `cleanupFinanceSeed`, which now also wipes `Payout` and `Notification`
 * rows the action creates.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/server/auth/index", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@stackzio/db";
import { createPayoutAction } from "./payout-actions";
import {
  seedFinanceOrg,
  cleanupFinanceSeed,
  signInAs,
  clearTestSession,
  type FinanceSeed,
} from "../../../tests/helpers/finance-seed";

describe("createPayoutAction (integration, real DB)", () => {
  let seed: FinanceSeed;

  beforeEach(async () => {
    seed = await seedFinanceOrg();
    await signInAs(seed.owner.id, seed.org.id);
  });

  afterEach(async () => {
    await clearTestSession();
    await cleanupFinanceSeed(seed);
  });

  it("rejects PROJECT kind without projectId", async () => {
    const res = await createPayoutAction({
      memberUserId: seed.member.id,
      kind: "PROJECT",
      amount: "1000",
      paidAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(false);
    const count = await prisma.payout.count({ where: { organizationId: seed.org.id } });
    expect(count).toBe(0);
  });

  it("rejects SALARY kind without periodMonth", async () => {
    const res = await createPayoutAction({
      memberUserId: seed.member.id,
      kind: "SALARY",
      amount: "10000",
      paidAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(false);
    const count = await prisma.payout.count({ where: { organizationId: seed.org.id } });
    expect(count).toBe(0);
  });

  it("rejects duplicate SALARY in the same month", async () => {
    const first = await createPayoutAction({
      memberUserId: seed.member.id,
      kind: "SALARY",
      amount: "1000",
      periodMonth: "2026-05",
      paidAt: "2026-05-10",
      method: "BANK",
    });
    expect(first.ok).toBe(true);

    const second = await createPayoutAction({
      memberUserId: seed.member.id,
      kind: "SALARY",
      amount: "2000",
      periodMonth: "2026-05",
      paidAt: "2026-05-11",
      method: "BANK",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already recorded/i);

    // Only the first row landed.
    const count = await prisma.payout.count({
      where: { organizationId: seed.org.id, kind: "SALARY" },
    });
    expect(count).toBe(1);
  });

  it("accepts BONUS without projectId or periodMonth", async () => {
    const res = await createPayoutAction({
      memberUserId: seed.member.id,
      kind: "BONUS",
      amount: "5000",
      paidAt: "2026-05-10",
      method: "BANK",
      note: "Q1 bonus",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const row = await prisma.payout.findUnique({ where: { id: res.payoutId } });
    expect(row).not.toBeNull();
    expect(row?.kind).toBe("BONUS");
    expect(row?.projectId).toBeNull();
    expect(row?.periodMonth).toBeNull();
    expect(row?.amount.toString()).toBe("5000");

    // Notification for the recipient was emitted.
    const note = await prisma.notification.findFirst({
      where: { userId: seed.member.id, refEntity: "payout", refId: res.payoutId },
    });
    expect(note).not.toBeNull();

    const log = await prisma.activityLog.findFirst({
      where: { entity: "payout", entityId: res.payoutId },
    });
    expect(log?.action).toBe("payout_recorded");
  });
});
