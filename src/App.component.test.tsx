import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { COMPARISON_SESSION_STORAGE_KEY, COMPARISON_TOTAL_ROUNDS } from "./features/comparison";
import { getGlobalQueryText, setGlobalQueryText } from "./lib/queryText";

const GENERATED_QUERY_TEXT = "dreamy indie pop female vocals night drive";

const buildComparisonSearchPayload = (labelPrefix: string) => ({
  candidates: Array.from({ length: 10 }, (_value, index) => {
    const trackNumber = index + 1;

    return {
      id: `${labelPrefix}-track-${trackNumber}`,
      title: `${labelPrefix} Option ${trackNumber}`,
      artistNames: ["Test Artist"],
      uri: `spotify:track:${labelPrefix}-track-${trackNumber}`
    };
  }),
  warning: null
});

const PRIMARY_SEARCH_RESPONSE = buildComparisonSearchPayload("primary");
const RETRY_SEARCH_RESPONSE = buildComparisonSearchPayload("retry");
const ROUND_1_LEFT_TRACK_ID = "primary-track-1";
const ROUND_1_RIGHT_TRACK_ID = "primary-track-2";
const ROUND_5_LEFT_TRACK_ID = "primary-track-9";
const RETRY_ROUND_2_LEFT_TRACK_ID = "retry-track-5";
const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

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

const startComparisonFromChat = async (
  user: ReturnType<typeof userEvent.setup>,
  options?: { waitForPair?: boolean }
) => {
  const waitForPair = options?.waitForPair ?? true;

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

  if (waitForPair) {
    await screen.findByRole("button", { name: "choose-right-track" });
  }
};

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setGlobalQueryText("");
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (input) => {
      const requestUrl = String(input);

      if (requestUrl === "/api/llm/route") {
        return {
          ok: true,
          json: async () => ({ queryText: GENERATED_QUERY_TEXT })
        };
      }

      if (requestUrl.startsWith("/api/comparison/search")) {
        return {
          ok: true,
          json: async () => PRIMARY_SEARCH_RESPONSE
        };
      }

      return {
        ok: false,
        json: async () => ({ error: "unknown_route" })
      };
    });
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("moves from chat stage to comparison round scaffold", async () => {
    const user = userEvent.setup();

    render(<App />);

    await startComparisonFromChat(user);

    expect(screen.getByText(`Round 1 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();
    expect(screen.getByLabelText("query-text-seed").textContent).toContain(GENERATED_QUERY_TEXT);
    expect(screen.getByLabelText("left-track-option")).toBeTruthy();
    expect(screen.getByLabelText("right-track-option")).toBeTruthy();

    const storedSession = window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY);
    expect(storedSession).toBeTruthy();
    expect(storedSession).toContain('"choices":[]');
    expect(getGlobalQueryText()).toBe(GENERATED_QUERY_TEXT);
    expect(mockFetch).toHaveBeenCalledWith("/api/comparison/search?q=dreamy+indie+pop+female+vocals+night+drive");
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
      leftTrackId: ROUND_1_LEFT_TRACK_ID,
      rightTrackId: ROUND_1_RIGHT_TRACK_ID,
      chosenTrackId: ROUND_1_LEFT_TRACK_ID
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
      leftTrackId: ROUND_1_LEFT_TRACK_ID,
      rightTrackId: ROUND_1_RIGHT_TRACK_ID,
      chosenTrackId: ROUND_1_RIGHT_TRACK_ID
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
      chosenTrackId: ROUND_1_LEFT_TRACK_ID
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
      chosenTrackId: ROUND_5_LEFT_TRACK_ID
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
      GENERATED_QUERY_TEXT
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

  it("retries by re-fetching candidates while preserving already saved choices", async () => {
    const user = userEvent.setup();
    let comparisonRequests = 0;

    mockFetch.mockImplementation(async (input) => {
      const requestUrl = String(input);

      if (requestUrl === "/api/llm/route") {
        return {
          ok: true,
          json: async () => ({ queryText: GENERATED_QUERY_TEXT })
        };
      }

      if (requestUrl.startsWith("/api/comparison/search")) {
        comparisonRequests += 1;
        return {
          ok: true,
          json: async () =>
            comparisonRequests === 1 ? PRIMARY_SEARCH_RESPONSE : RETRY_SEARCH_RESPONSE
        };
      }

      return {
        ok: false,
        json: async () => ({ error: "unknown_route" })
      };
    });

    render(<App />);

    await startComparisonFromChat(user);

    await user.click(screen.getByLabelText("left-track-option"));

    expect(screen.getByText(`Round 2 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "report-left-embed-unavailable" }));

    expect(screen.getByLabelText("embed-retry-state")).toBeTruthy();

    let storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(1);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      chosenTrackId: ROUND_1_LEFT_TRACK_ID
    });

    await user.click(screen.getByRole("button", { name: "retry-comparison-pair" }));

    expect(await screen.findByText("retry Option 5")).toBeTruthy();

    storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(1);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      chosenTrackId: ROUND_1_LEFT_TRACK_ID
    });

    await user.click(screen.getByLabelText("left-track-option"));

    expect(screen.getByText(`Round 3 of ${COMPARISON_TOTAL_ROUNDS}`)).toBeTruthy();

    storedSession = JSON.parse(
      window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY) ?? "{}"
    );

    expect(storedSession.choices).toHaveLength(2);
    expect(storedSession.choices[0]).toMatchObject({
      roundIndex: 1,
      chosenTrackId: ROUND_1_LEFT_TRACK_ID
    });
    expect(storedSession.choices[1]).toMatchObject({
      roundIndex: 2,
      chosenTrackId: RETRY_ROUND_2_LEFT_TRACK_ID
    });
  });

  it("shows a user-safe provider error state and recovers on retry", async () => {
    const user = userEvent.setup();
    let comparisonRequests = 0;

    mockFetch.mockImplementation(async (input) => {
      const requestUrl = String(input);

      if (requestUrl === "/api/llm/route") {
        return {
          ok: true,
          json: async () => ({ queryText: GENERATED_QUERY_TEXT })
        };
      }

      if (requestUrl.startsWith("/api/comparison/search")) {
        comparisonRequests += 1;

        if (comparisonRequests === 1) {
          return {
            ok: false,
            json: async () => ({ error: "spotify_rate_limited" })
          };
        }

        return {
          ok: true,
          json: async () => PRIMARY_SEARCH_RESPONSE
        };
      }

      return {
        ok: false,
        json: async () => ({ error: "unknown_route" })
      };
    });

    render(<App />);

    await startComparisonFromChat(user, { waitForPair: false });

    expect(await screen.findByLabelText("comparison-error-state")).toBeTruthy();
    expect(
      screen.getByText("Too many requests hit the music provider. Please wait a moment and retry.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("embed-retry-state")).toBeNull();

    await user.click(screen.getByRole("button", { name: "retry-comparison-search" }));

    expect(await screen.findByText("primary Option 1")).toBeTruthy();
    expect(screen.queryByLabelText("comparison-error-state")).toBeNull();
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
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => PRIMARY_SEARCH_RESPONSE
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
