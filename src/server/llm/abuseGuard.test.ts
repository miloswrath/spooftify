import { describe, expect, it } from "vitest";
import { isBlockedInput } from "./abuseGuard.js";

describe("isBlockedInput", () => {
  it("flags blocked phrases", () => {
    expect(isBlockedInput("This is spam")).toBe(true);
    expect(isBlockedInput("I HATE this")).toBe(true);
    expect(isBlockedInput("they promote violence in chat")).toBe(true);
  });

  it("allows normal input", () => {
    expect(isBlockedInput("I enjoy dreamy synth and mellow beats")).toBe(false);
  });
});