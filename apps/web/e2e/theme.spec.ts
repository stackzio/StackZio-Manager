import { expect, test } from "@playwright/test";
import { resetData, uniqueEmail } from "./helpers/data";
import { signupAndOnboard } from "./helpers/flows";

test.describe("theme toggle", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("toggling to dark persists across reload", async ({ page }) => {
    const email = uniqueEmail("theme");
    await signupAndOnboard(page, { name: "Theo", email, orgName: "Theme Co" });

    // Open theme menu (the one in the topbar) and pick Dark
    const toggle = page.getByRole("button", { name: /toggle theme/i }).first();
    await toggle.click();
    await page.getByRole("menuitem", { name: /^dark$/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
