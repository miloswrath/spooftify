import type { LlmClient } from "../types";

export function createLlmClient(): LlmClient {
  return {
    async summarizeVibe(input: string) {
      return {
        vibe: input.trim().length > 0 ? "chill" : "unknown"
      };
    }
  };
}