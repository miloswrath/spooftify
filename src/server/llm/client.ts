import type { LlmClient } from "../types";

const LOCAL_QWEN_CHAT_COMPLETIONS_URL = "http://127.0.0.1:1234/v1/chat/completions";
const LOCAL_QWEN_MODEL_NAME = "zai-org/glm-4.7-flash";
// Increase timeout to 45s to accommodate local model inference latency
const LOCAL_QWEN_TIMEOUT_MS = 45_000;

const QUERY_TEXT_SYSTEM_PROMPT = [
  "You are a music intelligence engine that converts conversational emotional context into a high-quality Spotify search phrase.",
  "",
  "Your job is NOT to mirror the user's words.",
  "Your job is to translate emotional intent into musically meaningful attributes using foundational music knowledge.",
  "",
  "Rules:",
  "1. Infer underlying emotional tone, energy level, era, genre influences, instrumentation, production style, and cultural movement.",
  "2. Do NOT use obvious or literal emotional words such as sad, happy, chill, angry, hype, romantic.",
  "3. Avoid repeating any distinctive words from the user message.",
  "4. Avoid generic adjectives.",
  "5. Favor genre micro-labels, instrumentation descriptors, vocal style, production aesthetics, tempo or energy signals, era references, and scene or movement associations.",
  "6. Do NOT produce song titles.",
  "7. Do NOT produce artist names.",
  "8. Do NOT describe the output.",
  "9. Output exactly one search phrase.",
  "10. Use 5 to 9 lower-case keywords separated by spaces.",
  "11. No punctuation.",
  "12. Plain text only.",
  "",
  "Your goal is to produce a search phrase that yields stylistically aligned but non-obvious results."
].join(" ");


type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

const normalizeQueryText = (value: string): string => value.trim().replace(/\s+/g, " ");

const normalizeJudgement = (value: string): string => value.trim();

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
    },
    async generateJudgement(systemPrompt: string, userPrompt: string) {
      const trimmedUserPrompt = userPrompt.trim();
      const trimmedSystemPrompt = systemPrompt.trim();

      if (!trimmedUserPrompt || !trimmedSystemPrompt) {
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
            temperature: 0.7,
            max_tokens: 256,
            messages: [
              {
                role: "system",
                content: trimmedSystemPrompt
              },
              {
                role: "user",
                content: trimmedUserPrompt
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

        const judgement = normalizeJudgement(content);

        if (!judgement) {
          throw new Error("empty_output");
        }

        return { judgement };
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