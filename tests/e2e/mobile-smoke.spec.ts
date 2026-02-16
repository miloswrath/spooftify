import { expect, test, type Page } from "@playwright/test";

const expectNoHorizontalScroll = async (page: Page) => {
  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth;
  });

  expect(hasHorizontalOverflow).toBe(false);
};

test("mobile smoke flow reaches comparison and records one selection", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Spooftify")).toBeVisible();
  await expect(page.getByText("Chat input stub")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Continue to comparison" }).click();

  await expect(page.getByLabel("comparison-stage")).toBeVisible();
  await expect(page.getByText("Round 1 of 5")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByLabel("left-track-option").click();

  await expect(page.getByText("Round 2 of 5")).toBeVisible();
  await expectNoHorizontalScroll(page);
});