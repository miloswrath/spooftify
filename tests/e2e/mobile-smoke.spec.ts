import { expect, test, type Page } from "@playwright/test";

const expectNoHorizontalScroll = async (page: Page) => {
  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth;
  });

  expect(hasHorizontalOverflow).toBe(false);
};

const sendChatTurn = async (page: Page, message: string) => {
  const sendButton = page.getByRole("button", { name: "send-message" });

  await page.getByLabel("message-input").fill(message);
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
  await expect(sendButton).toBeDisabled();
};

test("mobile smoke flow reaches comparison and records one selection", async ({ page }) => {
  await page.route("**/api/llm/route", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ queryText: "dreamy synth upbeat drums night drive" })
    });
  });

  await page.goto("/");

  await expect(page.getByText("Spooftify")).toBeVisible();
  await expect(page.getByLabel("chat-interface")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await sendChatTurn(page, "dreamy synth with upbeat drums");

  await expect(page.getByRole("button", { name: "continue-to-comparison" })).not.toBeVisible();

  await sendChatTurn(page, "high energy");

  await expect(page.getByRole("button", { name: "continue-to-comparison" })).not.toBeVisible();

  await sendChatTurn(page, "night drive");

  await expect(page.getByRole("button", { name: "continue-to-comparison" })).toBeVisible();
  await page.getByRole("button", { name: "continue-to-comparison" }).click();

  await expect(page.getByLabel("comparison-stage")).toBeVisible();
  await expect(page.getByText("Round 1 of 5")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "choose-left-track" }).click();

  await expect(page.getByText("Round 2 of 5")).toBeVisible();
  await expectNoHorizontalScroll(page);
});