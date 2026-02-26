import { afterEach, describe, expect, it, vi } from "vitest";
import { createLlmClient } from "./client.js";

describe("createLlmClient.generateQueryText", () => {
  const originalGroqApiKey = process.env.GROQ_API_KEY;
  const originalGroqModel = process.env.GROQ_MODEL;

  afterEach(() => {
    process.env.GROQ_API_KEY = originalGroqApiKey;
    process.env.GROQ_MODEL = originalGroqModel;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("builds a Groq OpenAI-compatible request and returns a normalized plain string", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: " dreamy   indie pop female vocals night drive "
            }
          }
        ]
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient();
    const result = await client.generateQueryText("need late night dreamy vibes");

    expect(result).toEqual({
      queryText: "dreamy indie pop female vocals night drive"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstCall = fetchMock.mock.calls.at(0) as
      | [
        string,
        {
          method: string;
          headers: Record<string, string>;
          body: string;
        }
      ]
      | undefined;

    expect(firstCall).toBeDefined();

    if (!firstCall) {
      throw new Error("expected fetch call");
    }

    const [url, options] = firstCall;

    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Authorization).toBe("Bearer test-groq-key");

    const payload = JSON.parse(options.body);

    expect(payload.model).toBe("llama-3.3-70b-versatile");
    expect(payload.messages[0].role).toBe("system");
    expect(typeof payload.messages[0].content).toBe("string");
    expect(payload.messages[1]).toEqual({
      role: "user",
      content: "need late night dreamy vibes"
    });
  });

  it("rejects malformed response payloads", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [] })
      }))
    );

    const client = createLlmClient();

    await expect(client.generateQueryText("chill indie")).rejects.toThrow("invalid_response_body");
  });

  it("rejects empty output after normalization", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "    "
              }
            }
          ]
        })
      }))
    );

    const client = createLlmClient();

    await expect(client.generateQueryText("chill indie")).rejects.toThrow("empty_output");
  });

  it("rejects with timeout when Groq does not respond in time", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";

    vi.useFakeTimers();

    const fetchMock = vi.fn((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient();
    const pendingResult = client.generateQueryText("slow response");
    const timeoutExpectation = expect(pendingResult).rejects.toThrow("timeout");

    await vi.advanceTimersByTimeAsync(8_100);

    await timeoutExpectation;
  });

  it("rejects with network_error when Groq endpoint is unreachable", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );

    const client = createLlmClient();

    await expect(client.generateQueryText("chill indie")).rejects.toThrow("network_error");
  });

  it("normalizes to lowercase keywords, strips punctuation, and caps to 9 tokens", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: " Neon, SYNTH-wave!!! driving bassline; shimmering arpeggios retro-futurist dancefloor pulse midnight "
              }
            }
          ]
        })
      }))
    );

    const client = createLlmClient();
    const result = await client.generateQueryText("night city vibe");

    expect(result).toEqual({
      queryText: "neon synth wave driving bassline shimmering arpeggios retro futurist"
    });
  });

  it("uses GROQ_MODEL override when provided", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.GROQ_MODEL = "openai/gpt-oss-20b";

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "dreamy indie pop female vocals"
            }
          }
        ]
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient();
    await client.generateQueryText("night drive vibes");

    const firstCall = fetchMock.mock.calls.at(0) as
      | [string, { body: string }]
      | undefined;

    expect(firstCall).toBeDefined();

    if (!firstCall) {
      throw new Error("expected fetch call");
    }

    const [, options] = firstCall;

    const payload = JSON.parse(options.body);
    expect(payload.model).toBe("openai/gpt-oss-20b");
  });

  it("rejects with missing_api_key when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient();

    await expect(client.generateQueryText("chill indie")).rejects.toThrow("missing_api_key");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("createLlmClient.generateJudgement", () => {
  const originalGroqApiKey = process.env.GROQ_API_KEY;
  const originalGroqModel = process.env.GROQ_MODEL;

  afterEach(() => {
    process.env.GROQ_API_KEY = originalGroqApiKey;
    process.env.GROQ_MODEL = originalGroqModel;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("builds a Groq OpenAI-compatible request and returns trimmed judgement text", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "  You have excellent taste.  "
            }
          }
        ]
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient();
    const result = await client.generateJudgement("system prompt", "user prompt");

    expect(result).toEqual({
      judgement: "You have excellent taste."
    });

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string }
    ];

    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Authorization).toBe("Bearer test-groq-key");

    const payload = JSON.parse(options.body);
    expect(payload.model).toBe("llama-3.3-70b-versatile");
    expect(payload.messages).toEqual([
      {
        role: "system",
        content: "system prompt"
      },
      {
        role: "user",
        content: "user prompt"
      }
    ]);
  });

  it("rejects with timeout when Groq judgement request exceeds timeout", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    vi.useFakeTimers();

    const fetchMock = vi.fn((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient();
    const pendingResult = client.generateJudgement("system", "user");
    const timeoutExpectation = expect(pendingResult).rejects.toThrow("timeout");

    await vi.advanceTimersByTimeAsync(30_100);
    await timeoutExpectation;
  });

  it("rejects with missing_api_key when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient();

    await expect(client.generateJudgement("system", "user")).rejects.toThrow("missing_api_key");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
