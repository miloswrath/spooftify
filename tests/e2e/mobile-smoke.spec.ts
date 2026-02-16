import { expect, test } from "@playwright/test";

test("mobile smoke flow reaches comparison stub", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Spooftify")).toBeVisible();
  await expect(page.getByLabel("chat-interface")).toBeVisible();

  await page.getByLabel("message-input").fill("dreamy synth with upbeat drums");
  await page.getByRole("button", { name: "send-message" }).click();

  await page.getByRole("button", { name: "continue-to-comparison" }).click();

  await expect(page.getByText("Comparison screen stub")).toBeVisible();
});