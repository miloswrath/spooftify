import { describe, it, expect } from "vitest";
import { buildJudgementPrompt, buildJudgementSystemPrompt } from "./promptBuilder";
import type { JudgementPromptInput } from "./types";

describe("buildJudgementPrompt", () => {
  it("should construct a valid prompt with complete input data", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "I love dark, moody indie music" },
        { id: "2", role: "assistant", content: "Got it. What about energy level?" },
        { id: "3", role: "user", content: "Low-key and introspective" }
      ],
      vibeCategories: ["dark", "moody", "introspective"],
      comparisonChoices: [
        {
          roundIndex: 1,
          leftTrackId: "track-1",
          rightTrackId: "track-2",
          chosenTrackId: "track-1"
        },
        {
          roundIndex: 2,
          leftTrackId: "track-3",
          rightTrackId: "track-4",
          chosenTrackId: "track-4"
        }
      ]
    };

    const result = buildJudgementPrompt(input);

    expect(result.prompt).toContain("dark, moody indie music");
    expect(result.prompt).toContain("Low-key and introspective");
    expect(result.prompt).toContain("dark, moody, introspective");
    expect(result.prompt).toContain("2 song choices");
    expect(result.prompt).toContain("playful");
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("should include system prompt context when called", () => {
    const systemPrompt = buildJudgementSystemPrompt();

    expect(systemPrompt).toContain("music taste judge");
    expect(systemPrompt).toContain("playful");
    expect(systemPrompt).toContain("3-5 sentences");
  });

  it("should handle empty chat messages gracefully", () => {
    const input: JudgementPromptInput = {
      chatMessages: [],
      vibeCategories: ["eclectic"],
      comparisonChoices: [
        {
          roundIndex: 1,
          leftTrackId: "track-1",
          rightTrackId: "track-2",
          chosenTrackId: "track-1"
        }
      ]
    };

    const result = buildJudgementPrompt(input);

    expect(result.prompt).toBeDefined();
    expect(result.prompt.length).toBeGreaterThan(0);
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("should handle empty vibe categories", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "Just play something" }
      ],
      vibeCategories: [],
      comparisonChoices: [
        {
          roundIndex: 1,
          leftTrackId: "track-1",
          rightTrackId: "track-2",
          chosenTrackId: "track-1"
        }
      ]
    };

    const result = buildJudgementPrompt(input);

    expect(result.prompt).toContain("No specific vibe categories");
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("should handle no comparison choices", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "Tell me about music" }
      ],
      vibeCategories: ["chill"],
      comparisonChoices: []
    };

    const result = buildJudgementPrompt(input);

    expect(result.prompt).toContain("made no selections");
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("should filter out non-user messages from transcript", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "user message 1" },
        { id: "2", role: "assistant", content: "This should be ignored" },
        { id: "3", role: "user", content: "user message 2" }
      ],
      vibeCategories: [],
      comparisonChoices: []
    };

    const result = buildJudgementPrompt(input);

    expect(result.prompt).toContain("user message 1");
    expect(result.prompt).toContain("user message 2");
    expect(result.prompt).not.toContain("This should be ignored");
  });

  it("should estimate token count reasonably", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "A".repeat(100) }
      ],
      vibeCategories: ["test"],
      comparisonChoices: [
        {
          roundIndex: 1,
          leftTrackId: "t1",
          rightTrackId: "t2",
          chosenTrackId: "t1"
        }
      ]
    };

    const result = buildJudgementPrompt(input);

    // Token estimate should be reasonable (not 0, not absurdly high)
    expect(result.tokenEstimate).toBeGreaterThan(100);
    expect(result.tokenEstimate).toBeLessThan(5000);
  });

  it("should be deterministic with identical inputs", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "I like jazz" },
        { id: "2", role: "user", content: "and blues" }
      ],
      vibeCategories: ["smooth", "classic"],
      comparisonChoices: [
        {
          roundIndex: 1,
          leftTrackId: "t1",
          rightTrackId: "t2",
          chosenTrackId: "t1"
        }
      ]
    };

    const result1 = buildJudgementPrompt(input);
    const result2 = buildJudgementPrompt(input);

    expect(result1.prompt).toBe(result2.prompt);
    expect(result1.tokenEstimate).toBe(result2.tokenEstimate);
  });

  it("should handle whitespace in messages correctly", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "  leading and trailing  " },
        { id: "2", role: "user", content: "\n\ntabs and newlines\t\t" }
      ],
      vibeCategories: [],
      comparisonChoices: []
    };

    const result = buildJudgementPrompt(input);

    // Whitespace is trimmed, so just check the core content is there
    expect(result.prompt).toContain("leading and trailing");
    expect(result.prompt).toContain("tabs and newlines");
  });

  it("should describe single choice correctly", () => {
    const input: JudgementPromptInput = {
      chatMessages: [
        { id: "1", role: "user", content: "play a song" }
      ],
      vibeCategories: [],
      comparisonChoices: [
        {
          roundIndex: 1,
          leftTrackId: "t1",
          rightTrackId: "t2",
          chosenTrackId: "t1"
        }
      ]
    };

    const result = buildJudgementPrompt(input);

    expect(result.prompt).toContain("1 song choice");
  });
});
