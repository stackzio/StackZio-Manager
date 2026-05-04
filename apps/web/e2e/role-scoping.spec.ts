import { expect, test } from "@playwright/test";
import { findInviteToken, resetData, uniqueEmail } from "./helpers/data";
import { logout, signupAndOnboard } from "./helpers/flows";

const PWD = "TestPass123!";

test.describe("role scoping for MEMBER role", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("member sees only assigned projects and cannot create new ones", async ({ page }) => {
    const ownerEmail = uniqueEmail("roleowner");
    const memberEmail = uniqueEmail("rolemember");

    // Owner sets things up
    await signupAndOnboard(page, { name: "Octa", email: ownerEmail, orgName: "Role Co" });

    await page.goto("/clients/new");
    await page.getByLabel("Client name").fill("Role Client");
    await page.getByRole("button", { name: /create client/i }).click();

    await page.goto("/projects/new");
    await page.getByLabel("Project name").fill("Hidden Project");
    await page.getByRole("combobox", { name: /^client$/i }).click();
    await page.getByRole("option", { name: /Role Client/i }).click();
    await page.getByLabel("Price total").fill("50000");
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/projects\/[\w-]+$/);

    // Invite the member
    await page.goto("/team");
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByRole("button", { name: /send invite/i }).click();
    const token = await findInviteToken(memberEmail);

    await logout(page);

    // Member signs up + accepts invite
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Mira Member");
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(PWD);
    await page.getByRole("button", { name: /create account/i }).click();
    await page.goto(`/invite/${token}`);
    await page.getByRole("button", { name: /accept invite/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Member visits /projects — Hidden Project should not appear
    await page.goto("/projects");
    await expect(page.getByText(/Hidden Project/)).toHaveCount(0);

    // Member should NOT see a "New project" button
    await expect(page.getByRole("link", { name: /new project/i })).toHaveCount(0);

    // Member should NOT see Team or Organization in sidebar (admin-only links)
    await expect(page.getByRole("link", { name: /^Team$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Organization$/ })).toHaveCount(0);
  });
});
