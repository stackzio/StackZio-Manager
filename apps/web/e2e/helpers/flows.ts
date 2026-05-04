import { expect, type Page } from "@playwright/test";

const PWD = "TestPass123!";

export async function signupAndOnboard(
  page: Page,
  args: { name: string; email: string; orgName: string },
): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(args.name);
  await page.getByLabel("Email").fill(args.email);
  await page.getByLabel("Password").fill(PWD);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/onboarding\/create-organization/);
  await page.getByLabel("Organization name").fill(args.orgName);
  await page.getByRole("button", { name: /create organization/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function login(page: Page, email: string, password = PWD): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/onboarding/);
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: /toggle theme|theme/i }).first().waitFor().catch(() => {});
  // Click the user avatar — it's the last button on the topbar.
  const avatarButton = page.locator("header button").last();
  await avatarButton.click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
}

export const TEST_PASSWORD = PWD;
