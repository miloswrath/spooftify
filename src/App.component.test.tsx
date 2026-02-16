import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("moves from chat stub to comparison stub", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText("Chat input stub")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Continue to comparison" }));

    expect(screen.getByText("Comparison screen stub")).toBeTruthy();
  });
});