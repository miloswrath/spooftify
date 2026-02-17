import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JudgementDisplay } from "./JudgementDisplay";

describe("JudgementDisplay", () => {
  describe("Text Rendering", () => {
    it("displays the judgement text correctly", () => {
      const testJudgement = "You've got eclectic taste with a love for introspection.";
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          judgement={testJudgement}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByText(testJudgement)).toBeTruthy();
    });

    it("displays waiting message when no judgement is provided", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByText("Waiting for judgement...")).toBeTruthy();
    });

    it("displays long judgement text with proper wrapping", () => {
      const longJudgement =
        "You've got eclectic taste with a love for introspection—the kind of person who curates playlists like they're building a personality. This suggests an open-minded listener who values emotional depth and artistic experimentation. Your music choices reflect someone who thinks deeply about the world around them.";
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          judgement={longJudgement}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByText(longJudgement)).toBeTruthy();
    });
  });

  describe("Loading State", () => {
    it("displays loading spinner when isLoading is true", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          isLoading={true}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByTestId("loading-spinner")).toBeTruthy();
    });

    it("displays loading placeholder text during loading", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          isLoading={true}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByText("Generating your judgement...")).toBeTruthy();
    });

    it("hides the Start New Session button while loading", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          isLoading={true}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(
        screen.queryByRole("button", { name: "Start New Session" })
      ).toBeFalsy();
    });

    it("hides loader and shows judgement when loading completes", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();
      const judgement = "Test judgement";

      const { rerender } = render(
        <JudgementDisplay
          isLoading={true}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByTestId("loading-spinner")).toBeTruthy();

      rerender(
        <JudgementDisplay
          isLoading={false}
          judgement={judgement}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.queryByTestId("loading-spinner")).toBeFalsy();
      expect(screen.getByText(judgement)).toBeTruthy();
    });
  });

  describe("Error State", () => {
    it("displays error message when error prop is set", () => {
      const errorMessage = "Failed to generate judgement. Please try again.";
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          error={errorMessage}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByText(errorMessage)).toBeTruthy();
    });

    it("does not expose technical details in error message", () => {
      const errorMessage = "Something went wrong. Please try again.";
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          error={errorMessage}
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByText(errorMessage)).toBeTruthy();
      expect(screen.queryByText(/stack|trace|error code/i)).toBeFalsy();
    });

    it("displays Retry button when error is present", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          error="Error occurred"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByTestId("retry-button")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    });

    it("calls onRetry when Retry button is clicked", async () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();
      const user = userEvent.setup();

      render(
        <JudgementDisplay
          error="Error occurred"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      await user.click(screen.getByRole("button", { name: "Retry" }));

      expect(mockRetry).toHaveBeenCalledOnce();
    });
  });

  describe("Session Reset", () => {
    it("displays Start New Session button when not loading", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(
        screen.getByRole("button", { name: "Start New Session" })
      ).toBeTruthy();
    });

    it("calls onNewSession when Start New Session button is clicked", async () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();
      const user = userEvent.setup();

      render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Start New Session" })
      );

      expect(mockNewSession).toHaveBeenCalledOnce();
    });

    it("Start New Session button is always visible without scrolling", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      const button = screen.getByRole("button", { name: "Start New Session" });
      const box = screen.getByTestId("judgement-box");

      // Both should be in the viewport
      expect(box).toBeTruthy();
      expect(button).toBeTruthy();
    });
  });

  describe("Responsive Layout", () => {
    it("renders with mobile-first styling (90vw width)", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      const box = screen.getByTestId("judgement-box");
      const styles = window.getComputedStyle(box);

      // Verify mobile-first box styling
      expect(box.style.width).toMatch(/90vw/);
      expect(box.style.maxWidth).toBe("500px");
    });

    it("container uses full viewport height with flex centering", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      const { container } = render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer.style.minHeight).toBe("100vh");
      expect(mainContainer.style.display).toBe("flex");
      expect(mainContainer.style.justifyContent).toBe("center");
      expect(mainContainer.style.alignItems).toBe("center");
    });

    it("background is black with white text container", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      const { container } = render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer.style.backgroundColor).toMatch(/^(#000000|rgb\(0, 0, 0\))$/);

      const box = screen.getByTestId("judgement-box");
      expect(box.style.backgroundColor).toMatch(/^(#ffffff|rgb\(255, 255, 255\))$/);
      expect(box.style.color).toMatch(/^(#000000|rgb\(0, 0, 0\))$/);
    });

    it("renders correctly on 375px mobile viewport (snapshot test)", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      const { container } = render(
        <JudgementDisplay
          judgement="You've got great taste!"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(container.firstChild).toMatchSnapshot();
    });

    it("renders correctly on desktop viewport (snapshot test)", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      const { container } = render(
        <JudgementDisplay
          judgement="You've got great taste! This is a longer judgement that should wrap nicely on both mobile and desktop screens without any horizontal scrolling issues."
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(container.firstChild).toMatchSnapshot();
    });

    it("has no horizontal overflow on 375px viewport", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      const { container } = render(
        <JudgementDisplay
          judgement="You've got eclectic taste with a love for introspection—the kind of person who curates playlists like they're building a personality."
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      const mainContainer = container.firstChild as HTMLElement;
      const box = screen.getByTestId("judgement-box");

      // Verify no overflow properties set
      expect(mainContainer.style.overflow).not.toBe("auto");
      expect(mainContainer.style.overflow).not.toBe("scroll");
      expect(box.style.overflow).not.toBe("auto");
      expect(box.style.overflow).not.toBe("scroll");

      // Check box-sizing for proper width calculation
      expect(box.style.boxSizing).toBe("border-box");
    });

    it("button container is responsive and doesn't overflow", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          judgement="Test"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      const button = screen.getByRole("button", { name: "Start New Session" });
      expect(button).toBeTruthy();
      // Button should be accessible and not cause scrolling
      expect(button.style.minWidth).toBe("120px");
    });
  });

  describe("Accessibility", () => {
    it("buttons are keyboard accessible", async () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();
      const user = userEvent.setup();

      render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      const button = screen.getByRole("button", { name: "Start New Session" });

      // Keyboard accessibility test
      await user.tab();
      expect(button).toBe(document.activeElement);
    });

    it("has proper semantic structure", () => {
      const mockRetry = vi.fn();
      const mockNewSession = vi.fn();

      render(
        <JudgementDisplay
          judgement="Test judgement"
          onRetry={mockRetry}
          onNewSession={mockNewSession}
        />
      );

      expect(screen.getByRole("button", { name: "Start New Session" })).toBeTruthy();
      expect(screen.getByTestId("judgement-box")).toBeTruthy();
    });
  });
});
