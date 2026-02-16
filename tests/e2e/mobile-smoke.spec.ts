<<<<<<< HEAD
=======
<<<<<<< HEAD
import { expect, test } from "@playwright/test";

test.describe("Mobile smoke flow", () => {
  test("reaches comparison stub from chat", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Spooftify")).toBeVisible();
    await expect(page.getByText("Chat input stub")).toBeVisible();

    await page.getByRole("button", { name: "Continue to comparison" }).click();

    await expect(page.getByText("Comparison screen stub")).toBeVisible();
  });

  test("completes full flow from chat to judgement on mobile", async ({ page }) => {
    await page.goto("/");

    // Chat stage
    await expect(page.getByText("Spooftify")).toBeVisible();
    await expect(page.getByText("Chat input stub")).toBeVisible();

    // Navigate to comparison
    await page.getByRole("button", { name: "Continue to comparison" }).click();
    await expect(page.getByText("Comparison screen stub")).toBeVisible();

    // Navigate to judgement
    await page.getByRole("button", { name: "Move to judgement (demo)" }).click();

    // Verify judgement is displayed
    await expect(page.getByText(/You've got eclectic taste/)).toBeVisible();
    await expect(page.getByTestId("judgement-box")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start New Session" })).toBeVisible();
  });

  test("judgement screen has no horizontal scrolling on mobile", async ({ page }) => {
    await page.goto("/");

    // Navigate to judgement
    await page.getByRole("button", { name: "Continue to comparison" }).click();
    await page.getByRole("button", { name: "Move to judgement (demo)" }).click();

    // Get the main container and judgement box
    const mainContainer = page.locator("main");
    const judgementBox = page.getByTestId("judgement-box");

    // Verify they are visible without requiring horizontal scroll
    await expect(mainContainer).toBeVisible();
    await expect(judgementBox).toBeVisible();

    // Check horizontal overflow by verifying width constraints
    const containerBox = await mainContainer.boundingBox();
    const boxBoundingBox = await judgementBox.boundingBox();

    if (containerBox && boxBoundingBox) {
      // Judgement box should fit within main container
      expect(boxBoundingBox.width).toBeLessThanOrEqual(containerBox.width);
    }
  });

  test("Start New Session button returns to chat", async ({ page }) => {
    await page.goto("/");

    // Navigate to judgement
    await page.getByRole("button", { name: "Continue to comparison" }).click();
    await page.getByRole("button", { name: "Move to judgement (demo)" }).click();

    // Verify we're on judgement screen
    await expect(page.getByText(/You've got eclectic taste/)).toBeVisible();

    // Click Start New Session
    await page.getByRole("button", { name: "Start New Session" }).click();

    // Should be back at chat
    await expect(page.getByText("Chat input stub")).toBeVisible();
    await expect(page.getByText(/You've got eclectic taste/)).not.toBeVisible();
  });

  test("buttons are accessible on 375px mobile viewport", async ({ page }) => {
    // The Playwright config already sets Pixel 5 as the mobile device
    await page.goto("/");

    // Navigate to judgement
    await page.getByRole("button", { name: "Continue to comparison" }).click();
    await page.getByRole("button", { name: "Move to judgement (demo)" }).click();

    // Verify both buttons are visible without scrolling
    const startNewSessionButton = page.getByRole("button", { name: "Start New Session" });
    const retryButton = page.getByRole("button", { name: "Retry" });

    // Start New Session should be visible
    await expect(startNewSessionButton).toBeVisible();

    // Verify button is clickable
    await startNewSessionButton.click();
    
    // Verify navigation back to chat
    await expect(page.getByText("Chat input stub")).toBeVisible();
  });
=======
>>>>>>> 20e3cb62fc2d0791b38dde13657395b5873b9d8b
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

  await page.getByRole("button", { name: "choose-left-track" }).click();

  await expect(page.getByText("Round 2 of 5")).toBeVisible();
  await expectNoHorizontalScroll(page);
<<<<<<< HEAD
=======
>>>>>>> 956bf5cee38784c789f5b6f1c67b92280ac2ca8b
>>>>>>> 20e3cb62fc2d0791b38dde13657395b5873b9d8b
});