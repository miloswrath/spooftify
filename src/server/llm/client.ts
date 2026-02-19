import type { LlmClient } from "../types";

const LOCAL_QWEN_CHAT_COMPLETIONS_URL = "http://127.0.0.1:1234/v1/chat/completions";
const LOCAL_QWEN_MODEL_NAME = "qwen5.2";
const LOCAL_QWEN_TIMEOUT_MS = 4_000;

const QUERY_TEXT_SYSTEM_PROMPT = [
  "Convert the user vibe context into exactly one Spotify search phrase.",
  "Return plain text only.",
  "Do not return JSON, markdown, labels, quotes, or explanations.",
  "Keep it concise and music-focused."
].join(" ");

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

const normalizeQueryText = (value: string): string => value.trim().replace(/\s+/g, " ");

export function createLlmClient(): LlmClient {
  return {
    async summarizeVibe(input: string) {
      return {
        vibe: input.trim().length > 0 ? "chill" : "unknown"
      };
    },
    async generateQueryText(input: string) {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        throw new Error("empty_input");
      }

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, LOCAL_QWEN_TIMEOUT_MS);

      try {
        const response = await fetch(LOCAL_QWEN_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: LOCAL_QWEN_MODEL_NAME,
            temperature: 0.2,
            max_tokens: 32,
            messages: [
              {
                role: "system",
                content: QUERY_TEXT_SYSTEM_PROMPT
              },
              {
                role: "user",
                content: trimmedInput
              }
            ]
          }),
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error("provider_status_error");
        }

        const payload = (await response.json()) as OpenAiCompatibleResponse;
        const content = payload.choices?.[0]?.message?.content;

        if (typeof content !== "string") {
          throw new Error("invalid_response_body");
        }

        const queryText = normalizeQueryText(content);

        if (!queryText) {
          throw new Error("empty_output");
        }

        return { queryText };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error("timeout");
        }

        if (error instanceof TypeError) {
          throw new Error("network_error");
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  };
}