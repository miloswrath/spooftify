import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows continue after user input and moves to comparison stub", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByLabelText("chat-interface")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "continue-to-comparison" })).toBeNull();

    await user.type(screen.getByLabelText("message-input"), "I want neon synthwave vibes");
    await user.click(screen.getByRole("button", { name: "send-message" }));

    expect(screen.getByRole("button", { name: "continue-to-comparison" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "continue-to-comparison" }));

    expect(screen.getByText("Comparison screen stub")).toBeTruthy();
  });
});