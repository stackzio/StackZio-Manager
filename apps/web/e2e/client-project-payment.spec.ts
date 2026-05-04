import { expect, test } from "@playwright/test";
import { resetData, uniqueEmail } from "./helpers/data";
import { signupAndOnboard } from "./helpers/flows";

test.describe("clients → projects → payments → dashboard", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("end-to-end happy path", async ({ page }) => {
    const email = uniqueEmail("flow");
    await signupAndOnboard(page, { name: "Flow Owner", email, orgName: "Flow Co" });

    // Create client
    await page.goto("/clients");
    await page.getByRole("link", { name: /new client/i }).first().click();
    await expect(page).toHaveURL(/\/clients\/new/);
    await page.getByLabel("Client name").fill("Acme Corp");
    await page.getByLabel("Company").fill("Acme Industries");
    await page.getByLabel("Email", { exact: true }).fill("hello@acme.example");
    await page.getByRole("button", { name: /create client/i }).click();
    await expect(page).toHaveURL(/\/clients\/[\w-]+$/);
    await expect(page.getByRole("heading", { name: /Acme Corp/i })).toBeVisible();

    // Create project for that client
    await page.goto("/projects/new");
    await page.getByLabel("Project name").fill("Website refresh");

    // Pick the client in the Select trigger
    await page.getByRole("combobox", { name: /^client$/i }).click();
    await page.getByRole("option", { name: /Acme Corp/i }).click();

    // Owner defaults to current user — confirm it's set
    await expect(page.getByRole("combobox", { name: /^owner$/i })).not.toHaveText(/select/i);

    await page.getByLabel("Price total").fill("100000");
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/projects\/[\w-]+$/);
    await expect(page.getByRole("heading", { name: /Website refresh/i })).toBeVisible();

    // Record a payment of 25000
    await page.getByRole("tab", { name: /payments/i }).click();
    await page.getByRole("button", { name: /record payment/i }).click();
    await page.getByLabel(/^amount$/i).fill("25000");
    await page.getByRole("button", { name: /record payment/i }).last().click();

    // Outstanding should reflect 75000
    await expect(page.getByText(/75,000/i).first()).toBeVisible();

    // Dashboard reflects revenue this month
    await page.goto("/dashboard");
    await expect(page.getByText(/Flow Co dashboard/i)).toBeVisible();
    await expect(page.getByText(/Revenue this month/i)).toBeVisible();
    // Either ₹25,000 (INR) or some money string showing 25,000
    await expect(page.getByText(/25,000/).first()).toBeVisible();
    // Top outstanding should mention the project
    await expect(page.getByRole("link", { name: /Website refresh/i })).toBeVisible();
  });
});
