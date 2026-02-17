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
  await expect(page.getByLabel("chat-interface")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByLabel("message-input").fill("dreamy synth with upbeat drums");
  await page.getByRole("button", { name: "send-message" }).click();
  await page.getByRole("button", { name: "continue-to-comparison" }).click();

  await expect(page.getByLabel("comparison-stage")).toBeVisible();
  await expect(page.getByText("Round 1 of 5")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "choose-left-track" }).click();

  await expect(page.getByText("Round 2 of 5")).toBeVisible();
  await expectNoHorizontalScroll(page);
});