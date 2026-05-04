import { expect, test } from "@playwright/test";
import { resetData, uniqueEmail } from "./helpers/data";
import { signupAndOnboard } from "./helpers/flows";

function futureLocal(daysAhead = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(15, 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
}

test.describe("meetings", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("schedule meeting → appears in list and on dashboard upcoming", async ({ page }) => {
    const email = uniqueEmail("meet");
    await signupAndOnboard(page, { name: "Mae", email, orgName: "Meet Co" });

    await page.goto("/meetings");
    await page.getByRole("link", { name: /new meeting/i }).first().click();
    await expect(page).toHaveURL(/\/meetings\/new/);

    await page.getByLabel("Title").fill("Strategy sync");
    await page.getByLabel("Date & time").fill(futureLocal(2));
    await page.getByRole("button", { name: /schedule meeting/i }).click();
    await expect(page).toHaveURL(/\/meetings\/[\w-]+$/);
    await expect(page.getByRole("heading", { name: /Strategy sync/i })).toBeVisible();

    await page.goto("/meetings");
    await expect(page.getByRole("link", { name: /Strategy sync/i }).first()).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText(/Upcoming/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Strategy sync/i }).first()).toBeVisible();
  });

  test("mark a scheduled meeting as done", async ({ page }) => {
    const email = uniqueEmail("meet-done");
    await signupAndOnboard(page, { name: "Dee", email, orgName: "Done Co" });

    await page.goto("/meetings/new");
    await page.getByLabel("Title").fill("Wrap-up call");
    await page.getByLabel("Date & time").fill(futureLocal(1));
    await page.getByRole("button", { name: /schedule meeting/i }).click();
    await expect(page).toHaveURL(/\/meetings\/[\w-]+$/);

    await page.getByRole("button", { name: /mark done/i }).click();
    await expect(page.getByText(/^DONE$/).first()).toBeVisible();
  });
});
