import { describe, expect, it } from "vitest";
import { isBlockedInput } from "./abuseGuard";

describe("isBlockedInput", () => {
  it("flags blocked phrases", () => {
    expect(isBlockedInput("I want peace and warmth")).toBe(true);
    expect(isBlockedInput("I feel full of LOVE")).toBe(true);
  });

  it("allows normal input", () => {
    expect(isBlockedInput("I prefer dreamy synth and nocturnal beats")).toBe(false);
  });
});
