/**
 * Integration tests for expense server actions.
 *
 * These run against the **dev DB** — there is no separate test DB in this
 * project's current setup (confirmed by absence of `DATABASE_URL_TEST` in
 * `.env` and no test-DB step in `playwright.config.ts`). Each test cleans
 * up the rows it created via `cleanupFinanceSeed()`.
 *
 * `next/cache.revalidatePath` is mocked because it requires the Next.js
 * request scope, which doesn't exist under Vitest. Everything else runs
 * for real: requireOrgFinance reads from the DB through the
 * `__setTestSession` override, the action writes a real Expense + a real
 * ActivityLog, and the test asserts on the persisted rows.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// IMPORTANT: mock before importing the action under test.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// next-auth's `auth()` is the fallback in `getCurrentUser` when no test
// session is set. Mocking the module here short-circuits next-auth's
// loading of `next/server` (which Vitest's CJS resolver can't follow).
// Our tests pin the session via `__setTestSession` before each case, so
// this mocked `auth()` should never actually be called — but if a test
// forgets to pin, it returns `null` and the action returns "Not signed in"
// rather than crashing.
vi.mock("@/server/auth/index", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@stackzio/db";
import { createExpenseAction } from "./expense-actions";
import {
  seedFinanceOrg,
  cleanupFinanceSeed,
  signInAs,
  clearTestSession,
  type FinanceSeed,
} from "../../../tests/helpers/finance-seed";

describe("createExpenseAction (integration, real DB)", () => {
  let seed: FinanceSeed;

  beforeEach(async () => {
    seed = await seedFinanceOrg();
    await signInAs(seed.owner.id, seed.org.id);
  });

  afterEach(async () => {
    await clearTestSession();
    await cleanupFinanceSeed(seed);
  });

  it("creates an expense and logs activity", async () => {
    const res = await createExpenseAction({
      categoryId: seed.category.id,
      amount: "1234.56",
      spentAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const row = await prisma.expense.findUnique({ where: { id: res.expenseId } });
    expect(row).not.toBeNull();
    expect(row?.amount.toString()).toBe("1234.56");
    expect(row?.currency).toBe("INR");
    expect(row?.organizationId).toBe(seed.org.id);
    expect(row?.createdById).toBe(seed.owner.id);

    const log = await prisma.activityLog.findFirst({
      where: { entityId: res.expenseId, entity: "expense" },
    });
    expect(log).not.toBeNull();
    expect(log?.action).toBe("expense_recorded");
    expect(log?.actorId).toBe(seed.owner.id);
  });

  it("rejects invalid amount", async () => {
    const res = await createExpenseAction({
      categoryId: seed.category.id,
      // reason: deliberately bad input — schema must reject before any DB write
      amount: "abc" as never,
      spentAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(false);
    // Confirm nothing was inserted.
    const count = await prisma.expense.count({ where: { organizationId: seed.org.id } });
    expect(count).toBe(0);
  });

  it("denies non-flagged admin (canSeeFinancials=false)", async () => {
    await signInAs(seed.adminNoFlag.id, seed.org.id);
    const res = await createExpenseAction({
      categoryId: seed.category.id,
      amount: "10",
      spentAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Finance access/i);

    // Confirm no rows leaked through.
    const count = await prisma.expense.count({ where: { organizationId: seed.org.id } });
    expect(count).toBe(0);
  });
});
