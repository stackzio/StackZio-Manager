import { expect, test } from "@playwright/test";
import { resetData, uniqueEmail } from "./helpers/data";
import { signupAndOnboard } from "./helpers/flows";

test.describe("client sales workflow", () => {
  test.beforeAll(async () => {
    await resetData();
  });

  test("interest, follow-up, and discussion notes", async ({ page }) => {
    const email = uniqueEmail("sales");
    await signupAndOnboard(page, { name: "Sales Owner", email, orgName: "Sales Co" });

    // Create client with interest + follow-up
    await page.goto("/clients");
    await page.getByRole("link", { name: /new client/i }).first().click();
    await expect(page).toHaveURL(/\/clients\/new/);
    await page.getByLabel("Client name").fill("E2E Sales Co");

    // Pick "Interested" from the Sales section Select
    // The SelectTrigger has id="interestStatus" and Label htmlFor="interestStatus" text "Interest"
    await page.getByRole("combobox", { name: /^interest$/i }).click();
    await page.getByRole("option", { name: /^interested$/i }).click();

    // Follow-up date + reason — linked via htmlFor on Label
    await page.getByLabel(/next follow-up/i).fill("2026-12-01T10:00");
    await page.getByLabel(/follow-up reason/i).fill("send the proposal");

    await page.getByRole("button", { name: /create client/i }).click();
    await expect(page).toHaveURL(/\/clients\/[\w-]+$/);
    await expect(page.getByRole("heading", { name: /E2E Sales Co/i })).toBeVisible();

    // Status badge visible on detail page
    await expect(page.getByText(/^Interested$/i).first()).toBeVisible();

    // Add a CALL note — textarea has aria-label="Discussion note"
    await page.getByLabel(/discussion note/i).fill("Spoke with founder, very keen.");
    // Select trigger has aria-label="Note kind"
    await page.getByRole("combobox", { name: /^note kind$/i }).click();
    await page.getByRole("option", { name: /^call$/i }).click();
    await page.getByRole("button", { name: /add note/i }).click();
    await expect(page.getByText("Spoke with founder, very keen.")).toBeVisible();

    // Add an EMAIL note
    await page.getByLabel(/discussion note/i).fill("Sent over the deck.");
    await page.getByRole("combobox", { name: /^note kind$/i }).click();
    await page.getByRole("option", { name: /^email$/i }).click();
    await page.getByRole("button", { name: /add note/i }).click();
    await expect(page.getByText("Sent over the deck.")).toBeVisible();

    // Mark the follow-up done — produces an auto note "Follow-up completed"
    await page.getByRole("button", { name: /mark done/i }).click();
    // After marking done, FollowUpCard shows "No follow-up scheduled."
    await expect(page.getByText(/no follow-up scheduled/i)).toBeVisible();
    // Auto note is added with body "Follow-up completed"
    await expect(page.getByText(/follow-up completed/i)).toBeVisible();

    // Change status via InterestSelect on detail page (aria-label="Client interest status")
    await page.getByRole("combobox", { name: /client interest status/i }).click();
    await page.getByRole("option", { name: /^negotiating$/i }).click();
    await expect(page.getByText(/^Negotiating$/).first()).toBeVisible();
  });
});
