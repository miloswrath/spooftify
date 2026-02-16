import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders chat interface and moves to comparison stub", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByLabelText("chat-interface")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "continue-to-comparison" }));

    expect(screen.getByText("Comparison screen stub")).toBeTruthy();
  });
});