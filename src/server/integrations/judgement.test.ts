import { describe, expect, it } from "vitest";
import { buildJudgementPrompt, type JudgementRequest } from "./judgement";
import { COMPARISON_TOTAL_ROUNDS } from "../../features/comparison";
import type { ComparisonSessionState } from "../../features/comparison";

describe("judgement prompt builder", () => {
  const createTestSession = (
    choiceCount: number,
    vibeContext?: string
  ): JudgementRequest => {
    const choices = Array.from({ length: choiceCount }, (_, i) => ({
      roundIndex: (i + 1) as any,
      leftTrackId: `left-track-${i + 1}`,
      rightTrackId: `right-track-${i + 1}`,
      chosenTrackId: i % 2 === 0 ? `left-track-${i + 1}` : `right-track-${i + 1}`,
      selectedAt: new Date().toISOString()
    }));

    const session: ComparisonSessionState = {
      totalRounds: COMPARISON_TOTAL_ROUNDS,
      choices
    };

    return {
      sessionData: session,
      vibeContext
    };
  };

  it("builds a valid prompt with multiple choices", () => {
    const request = createTestSession(3);
    const result = buildJudgementPrompt(request);

    expect(result.prompt).toBeTruthy();
    expect(result.prompt).toContain("Choice 1");
    expect(result.prompt).toContain("Choice 2");
    expect(result.prompt).toContain("Choice 3");
    // Verify that selected tracks appear in the prompt (chosen ones, not all options)
    expect(result.prompt).toContain("left-track-1"); // selected from choice 1
    expect(result.prompt).toContain("right-track-2"); // selected from choice 2
    expect(result.prompt).toContain("left-track-3"); // selected from choice 3
  });

  it("includes vibe context when provided", () => {
    const vibeContext = "chill indie vibes";
    const request = createTestSession(2, vibeContext);
    const result = buildJudgementPrompt(request);

    expect(result.prompt).toContain("User's Self-Described Vibe");
    expect(result.prompt).toContain(vibeContext);
  });

  it("omits vibe context when not provided", () => {
    const request = createTestSession(2);
    const result = buildJudgementPrompt(request);

    expect(result.prompt).not.toContain("User's Self-Described Vibe");
  });

  it("throws error when session has no choices", () => {
    const session: ComparisonSessionState = {
      totalRounds: COMPARISON_TOTAL_ROUNDS,
      choices: []
    };

    const request: JudgementRequest = {
      sessionData: session
    };

    expect(() => buildJudgementPrompt(request)).toThrow(
      "Cannot build judgement prompt: session has no comparison choices"
    );
  });

  it("estimates token count correctly", () => {
    const request = createTestSession(2);
    const result = buildJudgementPrompt(request);

    // Estimated tokens should be > 0 and reasonable for a typical prompt
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.estimatedTokens).toBeLessThan(500); // Sanity check: shouldn't exceed 500 for 2 choices
  });

  it("stays under 2000 token limit for full session", () => {
    const request = createTestSession(COMPARISON_TOTAL_ROUNDS, "complex vibe description with lots of details");
    const result = buildJudgementPrompt(request);

    expect(result.estimatedTokens).toBeLessThan(2000);
  });

  it("includes round indices in prompt", () => {
    const request = createTestSession(5);
    const result = buildJudgementPrompt(request);

    // Should mention rounds 1-5
    for (let i = 1; i <= 5; i++) {
      expect(result.prompt).toContain(`Round ${i}`);
    }
  });

  it("formats prompt with proper structure", () => {
    const request = createTestSession(2);
    const result = buildJudgementPrompt(request);

    // Prompt should contain key sections
    expect(result.prompt).toContain("Music Selection Pattern");
    expect(result.prompt).toContain("Selected track");
    expect(result.prompt).toContain("provide a judgement");
  });

  it("handles single choice session", () => {
    const request = createTestSession(1);
    const result = buildJudgementPrompt(request);

    expect(result.prompt).toContain("Choice 1");
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it("includes system instruction in prompt", () => {
    const request = createTestSession(2);
    const result = buildJudgementPrompt(request);

    expect(result.prompt).toContain("expert music taste analyst");
    expect(result.prompt).toContain("playful");
    expect(result.prompt).toContain("witty");
  });
});
