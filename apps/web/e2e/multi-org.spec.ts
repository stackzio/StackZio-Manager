import { expect, test } from "@playwright/test";
import { resetData, uniqueEmail } from "./helpers/data";
import { signupAndOnboard } from "./helpers/flows";

test.describe("multi-organization switching", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("user owns two orgs; switching scopes data", async ({ page }) => {
    const email = uniqueEmail("multi");
    await signupAndOnboard(page, { name: "Mira", email, orgName: "Org Alpha" });

    // Add a client in Alpha
    await page.goto("/clients/new");
    await page.getByLabel("Client name").fill("Alpha Customer");
    await page.getByRole("button", { name: /create client/i }).click();
    await expect(page.getByRole("heading", { name: /Alpha Customer/i })).toBeVisible();

    // Create a second organization
    await page.goto("/settings/organizations/new");
    await page.getByLabel("Organization name").fill("Org Beta");
    await page.getByRole("button", { name: /create organization/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Org Beta dashboard/i })).toBeVisible();

    // The Alpha client should not be visible in Beta
    await page.goto("/clients");
    await expect(page.getByText(/Alpha Customer/)).toHaveCount(0);

    // Switch back to Alpha via the topbar org switcher
    const switcher = page.locator("header button").first();
    await switcher.click();
    await page.getByRole("menuitem", { name: /^Org Alpha$/i }).click();
    await expect(page.getByRole("heading", { name: /Org Alpha dashboard/i })).toBeVisible();

    await page.goto("/clients");
    await expect(page.getByRole("link", { name: /Alpha Customer/i }).first()).toBeVisible();
  });
});
