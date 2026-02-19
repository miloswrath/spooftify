import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMPARISON_SESSION_STORAGE_KEY, COMPARISON_TOTAL_ROUNDS } from "./features/comparison";
import { App } from "./App";

const LEFT_TRACK_ID = "spotify:track:4uLU6hMCjMI75M1A2tKUQC";
const RIGHT_TRACK_ID = "spotify:track:1301WleyT98MSxVHPZCA6M";
const RETRY_LEFT_TRACK_ID = "spotify:track:5ChkMS8OtdzJeqyybCc9R5";

const sendChatMessage = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  const input = screen.getByLabelText("message-input") as HTMLInputElement;

  await user.type(input, text);

  const sendButton = screen.getByRole("button", { name: "send-message" }) as HTMLButtonElement;

  await waitFor(() => {
    expect(sendButton.disabled).toBe(false);
  });

  await user.click(sendButton);

  await waitFor(() => {
    expect(input.value).toBe("");
  });
};

const startComparisonFromChat = async (user: ReturnType<typeof userEvent.setup>) => {
  expect(screen.getByLabelText("chat-interface")).toBeTruthy();

  await sendChatMessage(user, "I want neon synthwave vibes");
  expect(screen.queryByRole("button", { name: "continue-to-comparison" })).toBeNull();

  await screen.findByText(/(energy|tempo|chaos|sprint|send)/i);

  await sendChatMessage(user, "high-energy and cinematic");
  await screen.findByText(/last one before i summon the algorithm/i);
  expect(screen.queryByRole("button", { name: "continue-to-comparison" })).toBeNull();

  await sendChatMessage(user, "driving through neon rain at night");
  await screen.findByText(/spotify search phrase/i);

  await user.click(await screen.findByRole("button", { name: "continue-to-comparison" }));
  await screen.findByRole("button", { name: "choose-right-track" });
};

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ queryText: "dreamy indie pop female vocals night drive" })
      }))
    );
  });

  it("moves from chat stage to comparison round scaffold", async () => {
    const user = userEvent.setup();

    render(<App />);

    await startComparisonFromChat(user);

    expect(screen.getByText(`Round 1 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();
    expect(screen.getByLabelText("query-text-seed").textContent).toContain(
      "dreamy indie pop female vocals night drive"
    );
    expect(screen.getByLabelText("left-track-option")).toBeTruthy();
    expect(screen.getByLabelText("right-track-option")).toBeTruthy();

    const storedSession = window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY);
    expect(storedSession).toBeTruthy();
    expect(storedSession).toContain('"choices":[]');
    expect(storedSession).toContain('"queryText":"dreamy indie pop female vocals night drive"');
  });

  it("saves left selection from card tap and advances exactly one round", async () => {
    const user = userEvent.setup();

    render(<App />);

    await startComparisonFromChat(user);

    await user.click(screen.getByLabelText("left-track-option"));

    expect(screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

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

    await startComparisonFromChat(user);

    await user.click(screen.getByRole("button", { name: "choose-right-track" }));

    expect(screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

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

    await startComparisonFromChat(user);

    const comparisonStage = screen.getByLabelText("comparison-stage");

    fireEvent.touchStart(comparisonStage, {
      changedTouches: [{ clientX: 200 }]
    });
    fireEvent.touchEnd(comparisonStage, {
      changedTouches: [{ clientX: 120 }]
    });

    expect(screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

    const storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(1);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      chosenTrackId: LEFT_TRACK_ID
    });
  });

  it("keeps final judgement trigger blocked until round 5 is completed", async () => {
    const user = userEvent.setup();

    render(<App />);

    await startComparisonFromChat(user);

    const finalJudgementTrigger = screen.getByRole("button", {
      name: "trigger-final-judgement"
    });

    expect((finalJudgementTrigger as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText("comparison-complete-state").textContent).toContain(
      "Comparison complete: false"
    );

    for (let completedRounds = 1; completedRounds < COMPARISON_TOTAL_ROUNDS; completedRounds += 1) {
      await user.click(screen.getByLabelText("left-track-option"));
    }

    expect(screen.getByText(`Round ${COMPARISON_TOTAL_ROUNDS} of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();
    expect(screen.getByLabelText("comparison-complete-state").textContent).toContain(
      "Comparison complete: false"
    );
    expect((finalJudgementTrigger as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByLabelText("left-track-option"));

    expect(screen.getByLabelText("comparison-complete-state").textContent).toContain(
      "Comparison complete: true"
    );
    expect((finalJudgementTrigger as HTMLButtonElement).disabled).toBe(false);

    const storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(COMPARISON_TOTAL_ROUNDS);
    expect(storedSession.choices.at(-1)).toMatchObject({
      roundIndex: COMPARISON_TOTAL_ROUNDS,
      chosenTrackId: LEFT_TRACK_ID
    });
  });

  it("rehydrates round progress from localStorage after refresh", async () => {
    const user = userEvent.setup();

    const firstRender = render(<App />);

    await startComparisonFromChat(user);
    await user.click(screen.getByLabelText("left-track-option"));
    await user.click(screen.getByLabelText("left-track-option"));

    firstRender.unmount();

    render(<App />);

    expect(screen.getByLabelText("comparison-stage")).toBeTruthy();
    expect(screen.getByLabelText("query-text-seed").textContent).toContain(
      "dreamy indie pop female vocals night drive"
    );
    expect(screen.getByText(`Round 3 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();
    expect(screen.getByLabelText("comparison-complete-state").textContent).toContain(
      "Comparison complete: false"
    );

    const storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(2);
    expect(storedSession.choices[0]).toMatchObject({ roundIndex: 1 });
    expect(storedSession.choices[1]).toMatchObject({ roundIndex: 2 });
  });

  it("shows retry state on embed failure and keeps round blocked until replacement pair loads", async () => {
    const user = userEvent.setup();

    render(<App />);

    await startComparisonFromChat(user);

    await user.click(screen.getByRole("button", { name: "report-left-embed-unavailable" }));

    expect(screen.getByLabelText("embed-retry-state")).toBeTruthy();

    await user.click(screen.getByLabelText("left-track-option"));

    expect(screen.getByText(`Round 1 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

    let storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "retry-comparison-pair" }));

    expect(screen.queryByLabelText("embed-retry-state")).toBeNull();
    expect(screen.getByText("Option C")).toBeTruthy();

    await user.click(screen.getByLabelText("left-track-option"));

    expect(screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

    storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(1);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      chosenTrackId: RETRY_LEFT_TRACK_ID
    });
  });

  it("shows query generation retry UI on failure and proceeds after retry succeeds", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "query_text_unavailable" })
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ queryText: "night drive synthwave neon city" })
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await sendChatMessage(user, "I want neon synthwave vibes");
    await screen.findByText(/(energy|tempo|chaos|sprint|send)/i);

    await sendChatMessage(user, "high-energy and cinematic");
    await screen.findByText(/last one before i summon the algorithm/i);

    await sendChatMessage(user, "driving through neon rain at night");
    await screen.findByText(/spotify search phrase/i);

    await user.click(await screen.findByRole("button", { name: "continue-to-comparison" }));

    expect(await screen.findByLabelText("query-generation-error")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "retry-query-generation" }));

    expect(await screen.findByText(`Round 1 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

    const storedSession = window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY);

    expect(storedSession).toContain('"queryText":"night drive synthwave neon city"');
  });
});
