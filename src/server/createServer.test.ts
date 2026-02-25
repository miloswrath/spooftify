import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "./createServer";

describe("createServer", () => {
  const fetchPreviewTrack = vi.fn(async (seed: string) => ({ id: "t1", title: seed }));
  const fetchPair = vi.fn(async (vibe: string) => ({ left: `${vibe}-L`, right: `${vibe}-R` }));
  const searchTracks = vi.fn(async () => [
    {
      id: "track-1",
      title: "Strobe Lights",
      artistNames: ["DJ Test"],
      uri: "spotify:track:track-1"
    }
  ]);
  const summarizeVibe = vi.fn(async () => ({ vibe: "chill" }));
  const generateQueryText = vi.fn(async () => ({ queryText: "dreamy indie pop female vocals" }));
  const generateJudgement = vi.fn(async () => ({
    judgement: "Your taste is wonderfully chaotic."
  }));
  const stderrWriteSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  const server = createServer({
    api1Client: {
      fetchPreviewTrack
    },
    api2Client: {
      fetchPair
    },
    spotifyClient: {
      searchTracks
    },
    llmClient: {
      summarizeVibe,
      generateQueryText,
      generateJudgement
    }
  });

  beforeEach(() => {
    fetchPreviewTrack.mockClear();
    fetchPair.mockClear();
    searchTracks.mockClear();
    summarizeVibe.mockClear();
    generateQueryText.mockClear();
    generateJudgement.mockClear();
    stderrWriteSpy.mockClear();
  });

  it("returns health status", async () => {
    const response = await request(server).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("returns api1 stubbed response", async () => {
    const response = await request(server).get("/api/api1/route?seed=focus");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "t1", title: "focus" });
  });

  it("sanitizes api1 seed before calling the client", async () => {
    const response = await request(server).get("/api/api1/route?seed=%20%20focus%09%20beats%20%20");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "t1", title: "focus beats" });
  });

  it("returns api2 stubbed response", async () => {
    const response = await request(server).get("/api/api2/route?vibe=lofi");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ left: "lofi-L", right: "lofi-R" });
  });

  it("returns mapped comparison search candidates", async () => {
    const response = await request(server).get("/api/comparison/search?q=dark%20synth");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      candidates: [
        {
          id: "track-1",
          title: "Strobe Lights",
          artistNames: ["DJ Test"],
          uri: "spotify:track:track-1"
        }
      ],
      warning: {
        code: "insufficient_comparison_candidates",
        message: "Fewer than 10 comparison candidates were returned. Retry to fetch another set."
      }
    });
    expect(searchTracks).toHaveBeenCalledWith({
      q: "dark synth",
      type: "track",
      limit: 10,
      offset: 0
    });
  });

  it("filters out invalid comparison candidates", async () => {
    searchTracks.mockResolvedValueOnce([
      {
        id: "valid-1",
        title: "Valid",
        artistNames: ["A"],
        uri: "spotify:track:valid-1"
      },
      {
        id: "no-uri",
        title: "No Uri",
        artistNames: ["B"],
        uri: ""
      },
      {
        id: "",
        title: "Bad Id",
        artistNames: ["C"],
        uri: "spotify:track:bad"
      }
    ]);

    const response = await request(server).get("/api/comparison/search?q=electro");

    expect(response.status).toBe(200);
    expect(response.body.candidates).toEqual([
      {
        id: "valid-1",
        title: "Valid",
        artistNames: ["A"],
        uri: "spotify:track:valid-1"
      }
    ]);
    expect(response.body.warning).toEqual({
      code: "insufficient_comparison_candidates",
      message: "Fewer than 10 comparison candidates were returned. Retry to fetch another set."
    });
  });

  it("returns exactly 10 candidates when more than 10 valid tracks are available", async () => {
    const manyCandidates = Array.from({ length: 12 }, (_value, index) => {
      const trackNumber = index + 1;

      return {
        id: `track-${trackNumber}`,
        title: `Track ${trackNumber}`,
        artistNames: ["DJ Test"],
        uri: `spotify:track:track-${trackNumber}`
      };
    });

    searchTracks.mockResolvedValueOnce(manyCandidates);

    const response = await request(server).get("/api/comparison/search?q=house");

    expect(response.status).toBe(200);
    expect(response.body.candidates).toHaveLength(10);
    expect(response.body.candidates[0]?.id).toBe("track-1");
    expect(response.body.candidates[9]?.id).toBe("track-10");
    expect(response.body.warning).toBeNull();
  });

  it("paginates spotify search with offset until 10 candidates are collected", async () => {
    const firstPage = Array.from({ length: 6 }, (_value, index) => {
      const trackNumber = index + 1;

      return {
        id: `track-${trackNumber}`,
        title: `Track ${trackNumber}`,
        artistNames: ["DJ Test"],
        uri: `spotify:track:track-${trackNumber}`
      };
    });
    const secondPage = Array.from({ length: 6 }, (_value, index) => {
      const trackNumber = index + 7;

      return {
        id: `track-${trackNumber}`,
        title: `Track ${trackNumber}`,
        artistNames: ["DJ Test"],
        uri: `spotify:track:track-${trackNumber}`
      };
    });

    searchTracks
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const response = await request(server).get("/api/comparison/search?q=house");

    expect(response.status).toBe(200);
    expect(response.body.candidates).toHaveLength(10);
    expect(searchTracks).toHaveBeenNthCalledWith(1, {
      q: "house",
      type: "track",
      limit: 10,
      offset: 0
    });
    expect(searchTracks).toHaveBeenNthCalledWith(2, {
      q: "house",
      type: "track",
      limit: 10,
      offset: 10
    });
  });

  it("rejects comparison search when query text is empty after sanitization", async () => {
    const response = await request(server).get("/api/comparison/search?q=%20%09%20");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "invalid_query_text" });
    expect(searchTracks).not.toHaveBeenCalled();
  });

  it("returns provider error state for spotify search failures", async () => {
    searchTracks.mockRejectedValueOnce(new Error("search failed"));

    const response = await request(server).get("/api/comparison/search?q=house");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "provider_unavailable" });
    expect(stderrWriteSpy).toHaveBeenCalled();
    expect(String(stderrWriteSpy.mock.calls[0]?.[0] ?? "")).toContain("query_length=");
    expect(String(stderrWriteSpy.mock.calls[0]?.[0] ?? "")).not.toContain("house");
  });

  it("maps spotify auth failures to a user-safe error code", async () => {
    searchTracks.mockRejectedValueOnce(new Error("spotify_auth_failed"));

    const response = await request(server).get("/api/comparison/search?q=house");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "spotify_auth_failed" });
  });

  it("maps spotify rate limit failures to retryable state", async () => {
    searchTracks.mockRejectedValueOnce(new Error("spotify_rate_limited"));

    const response = await request(server).get("/api/comparison/search?q=house");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "spotify_rate_limited" });
  });

  it("maps spotify network failures to retryable state", async () => {
    searchTracks.mockRejectedValueOnce(new Error("spotify_network_error"));

    const response = await request(server).get("/api/comparison/search?q=house");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "network_error" });
  });

  it("blocks abusive llm input", async () => {
    const response = await request(server).post("/api/llm/route").send({ message: "I hate everyone" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("blocked_input");
    expect(generateQueryText).not.toHaveBeenCalled();
  });

  it("accepts safe llm input", async () => {
    const response = await request(server)
      .post("/api/llm/route")
      .send({ message: "I want chill indie vibes" });

    expect(response.status).toBe(200);
    expect(response.body.queryText).toBe("dreamy indie pop female vocals");
  });

  it("returns user-safe retryable error when Groq times out", async () => {
    const failingServer = createServer({
      api1Client: {
        fetchPreviewTrack: vi.fn(async (seed: string) => ({ id: "t1", title: seed }))
      },
      api2Client: {
        fetchPair: vi.fn(async (vibe: string) => ({ left: `${vibe}-L`, right: `${vibe}-R` }))
      },
      spotifyClient: {
        searchTracks: vi.fn(async () => [])
      },
      llmClient: {
        summarizeVibe: vi.fn(async () => ({ vibe: "chill" })),
        generateQueryText: vi.fn(async () => {
          throw new Error("timeout");
        }),
        generateJudgement: vi.fn()
      }
    });

    const response = await request(failingServer)
      .post("/api/llm/route")
      .send({ message: "I want chill indie vibes" });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "query_text_unavailable",
      message: "Could not generate your Spotify search text right now. Please retry."
    });
  });

  it("returns user-safe retryable error for Groq network and provider failures", async () => {
    const networkFailingServer = createServer({
      api1Client: {
        fetchPreviewTrack: vi.fn(async (seed: string) => ({ id: "t1", title: seed }))
      },
      api2Client: {
        fetchPair: vi.fn(async (vibe: string) => ({ left: `${vibe}-L`, right: `${vibe}-R` }))
      },
      spotifyClient: {
        searchTracks: vi.fn(async () => [])
      },
      llmClient: {
        summarizeVibe: vi.fn(async () => ({ vibe: "chill" })),
        generateQueryText: vi.fn(async () => {
          throw new Error("network_error");
        }),
        generateJudgement: vi.fn()
      }
    });

    const providerFailingServer = createServer({
      api1Client: {
        fetchPreviewTrack: vi.fn(async (seed: string) => ({ id: "t1", title: seed }))
      },
      api2Client: {
        fetchPair: vi.fn(async (vibe: string) => ({ left: `${vibe}-L`, right: `${vibe}-R` }))
      },
      spotifyClient: {
        searchTracks: vi.fn(async () => [])
      },
      llmClient: {
        summarizeVibe: vi.fn(async () => ({ vibe: "chill" })),
        generateQueryText: vi.fn(async () => {
          throw new Error("provider_status_error");
        }),
        generateJudgement: vi.fn()
      }
    });

    const networkResponse = await request(networkFailingServer)
      .post("/api/llm/route")
      .send({ message: "I want chill indie vibes" });
    const providerResponse = await request(providerFailingServer)
      .post("/api/llm/route")
      .send({ message: "I want chill indie vibes" });

    expect(networkResponse.status).toBe(503);
    expect(networkResponse.body).toEqual({
      error: "query_text_unavailable",
      message: "Could not generate your Spotify search text right now. Please retry."
    });

    expect(providerResponse.status).toBe(503);
    expect(providerResponse.body).toEqual({
      error: "query_text_unavailable",
      message: "Could not generate your Spotify search text right now. Please retry."
    });
  });

  it("supports chat-to-query-to-comparison handoff contract", async () => {
    const handoffServer = createServer({
      api1Client: {
        fetchPreviewTrack: vi.fn(async (seed: string) => ({ id: "t1", title: seed }))
      },
      api2Client: {
        fetchPair: vi.fn(async (vibe: string) => ({ left: `${vibe}-L`, right: `${vibe}-R` }))
      },
      spotifyClient: {
        searchTracks: vi.fn(async ({ q }: { q: string }) => [
          {
            id: "track-1",
            title: "Strobe Lights",
            artistNames: ["DJ Test"],
            uri: "spotify:track:track-1"
          },
          {
            id: "track-2",
            title: "Night Drive",
            artistNames: ["DJ Test"],
            uri: "spotify:track:track-2"
          }
        ])
      },
      llmClient: {
        summarizeVibe: vi.fn(async () => ({ vibe: "chill" })),
        generateQueryText: vi.fn(async () => ({ queryText: "dreamy   indie\tpop" })),
        generateJudgement: vi.fn()
      }
    });

    const llmResponse = await request(handoffServer)
      .post("/api/llm/route")
      .send({ message: "night drive with neon lights" });

    expect(llmResponse.status).toBe(200);
    expect(llmResponse.body).toEqual({ queryText: "dreamy   indie\tpop" });

    const comparisonResponse = await request(handoffServer)
      .get("/api/comparison/search")
      .query({ q: llmResponse.body.queryText });

    expect(comparisonResponse.status).toBe(200);
    expect(comparisonResponse.body.candidates).toHaveLength(2);
  });
});
