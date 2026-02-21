import { beforeEach, describe, expect, it } from "vitest";
import {
  COMPARISON_SESSION_STORAGE_KEY,
  COMPARISON_TOTAL_ROUNDS
} from "./constants";
import {
  loadComparisonSession,
  resetComparisonSession,
  saveComparisonSession,
  saveQueryText,
  saveRoundChoice,
  startNewComparisonSession
} from "./storage";
import type { ComparisonSessionState } from "./types";

describe("comparison session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts a fresh session with fixed 5 rounds", () => {
    const session = startNewComparisonSession();

    expect(session).toEqual({
      totalRounds: COMPARISON_TOTAL_ROUNDS,
      choices: [],
      queryText: null
    });
    expect(loadComparisonSession()).toEqual(session);
  });

  it("overwrites previous session data on new session start", () => {
    const existing: ComparisonSessionState = {
      totalRounds: COMPARISON_TOTAL_ROUNDS,
      queryText: "old seed",
      choices: [
        {
          roundIndex: 1,
          leftTrackId: "left-track",
          rightTrackId: "right-track",
          chosenTrackId: "left-track",
          selectedAt: "2026-02-16T00:00:00.000Z"
        }
      ]
    };

    saveComparisonSession(existing);

    const session = startNewComparisonSession();

    expect(session.choices).toEqual([]);
    expect(loadComparisonSession()).toEqual(session);
  });

  it("persists and replaces a round choice by round index", () => {
    saveRoundChoice({
      roundIndex: 1,
      leftTrackId: "track-a",
      rightTrackId: "track-b",
      chosenTrackId: "track-a",
      selectedAt: "2026-02-16T00:00:00.000Z"
    });

    saveRoundChoice({
      roundIndex: 1,
      leftTrackId: "track-a",
      rightTrackId: "track-b",
      chosenTrackId: "track-b",
      selectedAt: "2026-02-16T00:00:01.000Z"
    });

    expect(loadComparisonSession()).toEqual({
      totalRounds: COMPARISON_TOTAL_ROUNDS,
      queryText: null,
      choices: [
        {
          roundIndex: 1,
          leftTrackId: "track-a",
          rightTrackId: "track-b",
          chosenTrackId: "track-b",
          selectedAt: "2026-02-16T00:00:01.000Z"
        }
      ]
    });
  });

  it("preserves the existing localStorage key and JSON schema", () => {
    saveRoundChoice({
      roundIndex: 1,
      leftTrackId: "track-a",
      rightTrackId: "track-b",
      chosenTrackId: "track-a",
      selectedAt: "2026-02-16T00:00:00.000Z"
    });

    const rawSession = window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY);

    expect(rawSession).toBeTruthy();
    expect(rawSession).toContain('"totalRounds":5');
    expect(rawSession).toContain('"choices":[{');
    expect(rawSession).toContain('"roundIndex":1');
    expect(rawSession).toContain('"leftTrackId":"track-a"');
    expect(rawSession).toContain('"rightTrackId":"track-b"');
    expect(rawSession).toContain('"chosenTrackId":"track-a"');
  });

  it("resets the current session from localStorage", () => {
    startNewComparisonSession();

    resetComparisonSession();

    expect(window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY)).toBeNull();
    expect(loadComparisonSession()).toBeNull();
  });

  it("returns null for invalid stored session payload", () => {
    window.localStorage.setItem(
      COMPARISON_SESSION_STORAGE_KEY,
      JSON.stringify({ totalRounds: 3, choices: [] })
    );

    expect(loadComparisonSession()).toBeNull();
  });

  it("persists query text in the existing session flow", () => {
    startNewComparisonSession();

    const session = saveQueryText("dreamy indie pop female vocals night drive");

    expect(session.queryText).toBe("dreamy indie pop female vocals night drive");
    expect(loadComparisonSession()?.queryText).toBe("dreamy indie pop female vocals night drive");
  });
});