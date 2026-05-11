import { expect, test } from "@playwright/test";

test("login page is reachable on mobile", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log ind" })).toBeVisible();
});
