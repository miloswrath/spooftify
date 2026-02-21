import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ComparisonSearchError,
  fetchComparisonCandidates
} from "./search";

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

describe("comparison search client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws invalid_query_text when query sanitizes to empty", async () => {
    await expect(fetchComparisonCandidates(" \t ")).rejects.toEqual(
      expect.objectContaining({
        code: "invalid_query_text"
      })
    );
  });

  it("maps provider rate limit error codes", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "spotify_rate_limited" })
    });

    await expect(fetchComparisonCandidates("dark synth")).rejects.toEqual(
      expect.objectContaining<Partial<ComparisonSearchError>>({
        code: "spotify_rate_limited"
      })
    );
  });

  it("maps network failures to retryable error code", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(fetchComparisonCandidates("dark synth")).rejects.toEqual(
      expect.objectContaining<Partial<ComparisonSearchError>>({
        code: "network_error"
      })
    );
  });

  it("returns valid mapped candidate payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            id: "track-1",
            title: "Track 1",
            artistNames: ["Artist"],
            previewUrl: "https://audio.example/track-1.mp3",
            embedUrl: "https://open.spotify.com/embed/track/track-1"
          }
        ],
        warning: null
      })
    });

    const result = await fetchComparisonCandidates("dark synth");

    expect(result.candidates).toHaveLength(1);
    expect(result.warning).toBeNull();
  });
});
