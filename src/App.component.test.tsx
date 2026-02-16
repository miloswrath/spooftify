import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { COMPARISON_SESSION_STORAGE_KEY, COMPARISON_TOTAL_ROUNDS } from "./features/comparison";
import { App } from "./App";

const LEFT_TRACK_ID = "spotify:track:4uLU6hMCjMI75M1A2tKUQC";
const RIGHT_TRACK_ID = "spotify:track:1301WleyT98MSxVHPZCA6M";

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("moves from chat stage to comparison round scaffold", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText("Chat input stub")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Continue to comparison" })
    );

    expect(
      screen.getByText(`Round 1 of ${COMPARISON_TOTAL_ROUNDS}`)
    ).toBeTruthy();
    expect(screen.getByLabelText("left-track-option")).toBeTruthy();
    expect(screen.getByLabelText("right-track-option")).toBeTruthy();

    const storedSession = window.localStorage.getItem(
      COMPARISON_SESSION_STORAGE_KEY
    );
    expect(storedSession).toBeTruthy();
    expect(storedSession).toContain('"choices":[]');
  });

  it("saves left selection from card tap and advances exactly one round", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue to comparison" }));

    await user.click(screen.getByLabelText("left-track-option"));

    expect(
      screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)
    ).toBeTruthy();

    const storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(1);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      leftTrackId: LEFT_TRACK_ID,
      rightTrackId: RIGHT_TRACK_ID,
      chosenTrackId: LEFT_TRACK_ID
    });
  });

  it("saves right selection from action zone button and advances one round", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue to comparison" }));

    await user.click(screen.getByRole("button", { name: "choose-right-track" }));

    expect(
      screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)
    ).toBeTruthy();

    const storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(1);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      leftTrackId: LEFT_TRACK_ID,
      rightTrackId: RIGHT_TRACK_ID,
      chosenTrackId: RIGHT_TRACK_ID
    });
  });

  it("maps swipe-left to left selection using the same persistence path", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue to comparison" }));

    const comparisonStage = screen.getByLabelText("comparison-stage");

    fireEvent.touchStart(comparisonStage, {
      changedTouches: [{ clientX: 200 }]
    });
    fireEvent.touchEnd(comparisonStage, {
      changedTouches: [{ clientX: 120 }]
    });

    expect(
      screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)
    ).toBeTruthy();

    const storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(1);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      chosenTrackId: LEFT_TRACK_ID
    });
  });
});