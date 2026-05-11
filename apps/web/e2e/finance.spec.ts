import { expect, test } from "@playwright/test";
import { resetData, seedOrgWithRoles, type SeededOrgRoles } from "./helpers/data";
import { login } from "./helpers/flows";

/**
 * Finance e2e — Phase 14 of the Finance feature.
 *
 * Covers the three guardrails the spec calls out:
 *   1. Owner can record expense + salary + bonus and /finance reflects them.
 *   2. A non-flagged admin (canSeeFinancials = false) is redirected away
 *      from /finance back to /dashboard.
 *   3. A MEMBER sees only their own earnings on /my-earnings and never
 *      the org-wide finance pages (no "Expenses by category", "Top vendors",
 *      etc.).
 *
 * All three tests share one seeded org for speed and determinism. Each test
 * runs in its own page, so cookie state doesn't bleed.
 */
test.describe("Finance — RBAC + record-and-report", () => {
  let seeded: SeededOrgRoles;

  test.beforeAll(async () => {
    await resetData();
    seeded = await seedOrgWithRoles({ orgName: "Finance Co", prefix: "fin" });
  });

  test("owner records expense + salary + bonus, /finance picks them up", async ({
    page,
  }) => {
    await login(page, seeded.ownerEmail, seeded.password);

    // --- 1. Record an expense ----------------------------------------------
    await page.goto("/expenses");
    await page.getByRole("button", { name: /add expense/i }).click();

    // The dialog is keyed by the "Record expense" heading.
    await expect(page.getByRole("heading", { name: /record expense/i })).toBeVisible();

    // Category select is the first one in the dialog. Open it, pick whatever
    // first option the seeded categories offered ("Software").
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /software/i }).click();

    await page.getByLabel(/^vendor$/i).fill("Cloudflare");
    await page.getByLabel(/^amount/i).fill("1500");

    // The form's spentAt defaults to today; no need to fill it.
    await page.getByRole("button", { name: /record expense|save changes/i }).click();

    // Toast confirms; row appears in the table.
    await expect(page.getByText("Cloudflare").first()).toBeVisible();

    // --- 2. Record a salary payout -----------------------------------------
    await page.goto("/payouts");
    await page.getByRole("button", { name: /record payout/i }).click();
    await expect(page.getByRole("heading", { name: /record payout/i })).toBeVisible();

    // SALARY is the default tab. Pick the owner (only finance-eligible row
    // here, but any member works).
    await page.getByRole("combobox", { name: /member/i }).click();
    await page.getByRole("option").first().click();

    // Salary amount → submit.
    await page.getByLabel(/^amount/i).fill("60000");
    await page.getByRole("button", { name: /record payout/i }).last().click();

    // --- 3. Record a bonus payout ------------------------------------------
    await page.getByRole("button", { name: /record payout/i }).click();
    await expect(page.getByRole("heading", { name: /record payout/i })).toBeVisible();

    // Switch to BONUS tab.
    await page.getByRole("tab", { name: /bonus/i }).click();
    await page.getByRole("combobox", { name: /member/i }).click();
    await page.getByRole("option").first().click();
    await page.getByLabel(/^amount/i).fill("5000");
    await page.getByRole("button", { name: /record payout/i }).last().click();

    // --- 4. /finance reflects the new entries ------------------------------
    await page.goto("/finance");
    await expect(
      page.getByRole("heading", { name: /profit.*loss/i }),
    ).toBeVisible();

    // KPI strip has stable testids per kind. Numbers should be non-zero now
    // (the AnimatedAmount span eventually settles on the final formatted
    // value — we look for a non-zero amount string in the expenses cell).
    const expensesValue = page.locator('[data-testid="kpi-expenses-value"]');
    const payoutsValue = page.locator('[data-testid="kpi-payouts-value"]');

    // Wait for AnimatedAmount spring to settle.
    await expect(expensesValue).not.toHaveText(/^[^0-9]*0[.,]?0*[^0-9]*$/, {
      timeout: 10_000,
    });
    await expect(payoutsValue).not.toHaveText(/^[^0-9]*0[.,]?0*[^0-9]*$/, {
      timeout: 10_000,
    });

    // Vendor + member should appear in the "Top tables" section.
    await expect(page.getByText(/Cloudflare/).first()).toBeVisible();
  });

  test("non-flagged admin is redirected from /finance to /dashboard", async ({
    page,
  }) => {
    await login(page, seeded.adminNoFlagEmail, seeded.password);

    await page.goto("/finance");

    // The page guard does `redirect("/dashboard")` synchronously, so the
    // browser ends up on dashboard rather than finance.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("member sees their own earnings page but never org finance strings", async ({
    page,
  }) => {
    await login(page, seeded.memberEmail, seeded.password);

    await page.goto("/my-earnings");

    // The hero copy starts with "You earned …". That's their signpost.
    await expect(page.getByText(/you earned/i)).toBeVisible();

    // None of the org-finance UI labels should leak in here.
    await expect(page.getByText(/expenses by category/i)).toHaveCount(0);
    await expect(page.getByText(/top vendors/i)).toHaveCount(0);
    await expect(page.getByText(/profit.*loss/i)).toHaveCount(0);
    await expect(page.getByText(/payouts by kind/i)).toHaveCount(0);

    // Also: the org-finance pages must redirect a member elsewhere.
    await page.goto("/finance");
    await expect(page).toHaveURL(/\/dashboard|\/my-earnings/);
  });
});
