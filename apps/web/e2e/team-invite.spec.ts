import { expect, test } from "@playwright/test";
import { findInviteToken, resetData, uniqueEmail } from "./helpers/data";
import { logout, signupAndOnboard } from "./helpers/flows";

const PWD = "TestPass123!";

test.describe("team invite + accept flow", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("admin invites teammate → teammate signs up → accepts invite → joins org", async ({ page }) => {
    const ownerEmail = uniqueEmail("owner");
    const teammateEmail = uniqueEmail("mate");

    await signupAndOnboard(page, { name: "Olive Owner", email: ownerEmail, orgName: "Invite Co" });

    // Send the invite from the team page
    await page.goto("/team");
    await page.getByLabel("Email").fill(teammateEmail);
    await page.getByRole("button", { name: /send invite/i }).click();
    await expect(page.getByText(teammateEmail)).toBeVisible();

    // Pull the token straight from the DB
    const token = await findInviteToken(teammateEmail);
    expect(token).toBeTruthy();

    // Owner signs out
    await logout(page);

    // Teammate signs up at /register, then visits the invite link
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Marvin Mate");
    await page.getByLabel("Email").fill(teammateEmail);
    await page.getByLabel("Password").fill(PWD);
    await page.getByRole("button", { name: /create account/i }).click();
    // They land on onboarding; instead of creating an org, navigate to the invite
    await page.goto(`/invite/${token}`);
    await expect(page.getByRole("heading", { name: /Invite Co/i })).toBeVisible();
    await page.getByRole("button", { name: /accept invite/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Invite Co dashboard/i })).toBeVisible();
  });

  test("invite for a different email is rejected", async ({ page }) => {
    const ownerEmail = uniqueEmail("owner2");
    const inviteeEmail = uniqueEmail("invitee");
    const wrongEmail = uniqueEmail("wrong");

    await signupAndOnboard(page, { name: "Olivia", email: ownerEmail, orgName: "Mismatch Co" });
    await page.goto("/team");
    await page.getByLabel("Email").fill(inviteeEmail);
    await page.getByRole("button", { name: /send invite/i }).click();
    const token = await findInviteToken(inviteeEmail);
    expect(token).toBeTruthy();
    await logout(page);

    // Sign up with a *different* email, then try to use the invite
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Wrong Person");
    await page.getByLabel("Email").fill(wrongEmail);
    await page.getByLabel("Password").fill(PWD);
    await page.getByRole("button", { name: /create account/i }).click();
    // Land on onboarding (since they have no org yet) — go to the invite
    await page.goto(`/invite/${token}`);
    await expect(page.getByText(/different email address/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /accept invite/i })).toBeDisabled();
  });
});
