import { expect, test, type Page } from "@playwright/test";

const buildComparisonSearchPayload = () => ({
  candidates: Array.from({ length: 10 }, (_value, index) => {
    const trackNumber = index + 1;
    const trackId = `E2ETRACK${trackNumber}`;

    return {
      id: trackId,
      title: `E2E Option ${trackNumber}`,
      artistNames: ["Test Artist"],
      uri: `spotify:track:${trackId}`
    };
  }),
  warning: null
});

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

  await page.route("**/api/comparison/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildComparisonSearchPayload())
    });
  });

  await page.route("https://open.spotify.com/oembed*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        iframe_url: "https://open.spotify.com/embed/track/e2e-mock"
      })
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
  await expect(page.getByLabel("swipe-selection-hint")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "choose-left-track" }).click();

  await expect(page.getByText("Round 2 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "trigger-final-judgement" })).not.toBeVisible();
  await expectNoHorizontalScroll(page);

  for (let round = 2; round <= 5; round += 1) {
    await expect(page.getByRole("button", { name: "choose-left-track" })).toBeEnabled();
    await page.getByRole("button", { name: "choose-left-track" }).click();

    if (round < 5) {
      await expect(page.getByText(`Round ${round + 1} of 5`)).toBeVisible();
      await expect(page.getByRole("button", { name: "trigger-final-judgement" })).not.toBeVisible();
    }
  }

  await expect(page.getByRole("button", { name: "trigger-final-judgement" })).toBeVisible();
  await page.getByRole("button", { name: "trigger-final-judgement" }).click();

  await expect(page.getByLabel("judgement-stage")).toBeVisible();
  await expect(page.getByTestId("judgement-box")).toBeVisible();
  await expectNoHorizontalScroll(page);
});
