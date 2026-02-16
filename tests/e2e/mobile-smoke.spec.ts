import { expect, test } from "@playwright/test";

test("mobile smoke flow reaches comparison stub", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Spooftify")).toBeVisible();
  await expect(page.getByText("Chat input stub")).toBeVisible();

  await page.getByRole("button", { name: "Continue to comparison" }).click();

  await expect(page.getByText("Comparison screen stub")).toBeVisible();
});