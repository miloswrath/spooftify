import { afterEach, describe, expect, it, vi } from "vitest";
import { createLlmClient } from "./client";

describe("createLlmClient.generateQueryText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("builds an OpenAI-compatible request for local qwen and returns a normalized plain string", async () => {
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

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string }
    ];

    expect(url).toBe("http://127.0.0.1:1234/v1/chat/completions");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const payload = JSON.parse(options.body);

    expect(payload.model).toBe("zai-org/glm-4.7-flash");
    expect(payload.messages[0].role).toBe("system");
    expect(typeof payload.messages[0].content).toBe("string");
    expect(payload.messages[1]).toEqual({
      role: "user",
      content: "need late night dreamy vibes"
    });
  });

  it("rejects malformed response payloads", async () => {
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

  it("rejects with timeout when local model does not respond in time", async () => {
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

    await vi.advanceTimersByTimeAsync(4_100);

    await timeoutExpectation;
  });

  it("rejects with network_error when local endpoint is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );

    const client = createLlmClient();

    await expect(client.generateQueryText("chill indie")).rejects.toThrow("network_error");
  });
});
