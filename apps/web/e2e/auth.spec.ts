import { expect, test } from "@playwright/test";
import { resetData, uniqueEmail } from "./helpers/data";
import { login, logout, signupAndOnboard, TEST_PASSWORD } from "./helpers/flows";

test.describe("auth + onboarding", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("signup → create organization → dashboard → logout → login", async ({ page }) => {
    const email = uniqueEmail("auth");
    await signupAndOnboard(page, { name: "Alex Test", email, orgName: "Auth Test Co" });

    // Dashboard shows our org name and personalised greeting
    await expect(page.getByRole("heading", { name: /Auth Test Co dashboard/i })).toBeVisible();
    await expect(page.getByText(/Welcome back, Alex/i)).toBeVisible();

    await logout(page);
    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Auth Test Co dashboard/i })).toBeVisible();
  });

  test("rejects bad credentials", async ({ page }) => {
    const email = uniqueEmail("auth-bad");
    await signupAndOnboard(page, { name: "Sam", email, orgName: "Bad Creds Co" });
    await logout(page);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test("password length validation", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Pat");
    await page.getByLabel("Email").fill(uniqueEmail("len"));
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    // Either inline error or HTML5 minLength prevents submit; just assert we
    // didn't navigate to onboarding.
    await expect(page).not.toHaveURL(/\/onboarding/);
    void TEST_PASSWORD; // keep import live
  });
});
