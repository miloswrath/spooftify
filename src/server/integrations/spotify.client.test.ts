import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSpotifyClient } from "./spotify.client";

const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SPOTIFY_SEARCH_ENDPOINT = "https://api.spotify.com/v1/search";

type MockResponsePayload = Record<string, unknown>;

const createMockResponse = (
  payload: MockResponsePayload,
  options: { ok?: boolean; status?: number } = {}
): Response => {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload
  } as Response;
};

describe("createSpotifyClient", () => {
  const originalSpotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const originalSpotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const originalSpotifyApi = process.env.SPOTIFY_API;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (typeof originalSpotifyClientId === "string") {
      process.env.SPOTIFY_CLIENT_ID = originalSpotifyClientId;
    } else {
      delete process.env.SPOTIFY_CLIENT_ID;
    }

    if (typeof originalSpotifyClientSecret === "string") {
      process.env.SPOTIFY_CLIENT_SECRET = originalSpotifyClientSecret;
    } else {
      delete process.env.SPOTIFY_CLIENT_SECRET;
    }

    if (typeof originalSpotifyApi === "string") {
      process.env.SPOTIFY_API = originalSpotifyApi;
    } else {
      delete process.env.SPOTIFY_API;
    }
  });

  it("authenticates with SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET", async () => {
    process.env.SPOTIFY_CLIENT_ID = "client-id";
    process.env.SPOTIFY_CLIENT_SECRET = "client-secret";
    delete process.env.SPOTIFY_API;

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createMockResponse({ access_token: "token-123" }))
      .mockResolvedValueOnce(
        createMockResponse({
          tracks: {
            items: [
              {
                id: "track-1",
                name: "Track One",
                artists: [{ name: "Artist One" }],
                uri: "spotify:track:track-1"
              }
            ]
          }
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = createSpotifyClient();
    const tracks = await client.searchTracks({ q: "lofi", type: "track", limit: 5, offset: 10 });

    const encodedCredentials = Buffer.from("client-id:client-secret").toString("base64");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      SPOTIFY_TOKEN_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Basic ${encodedCredentials}`
        })
      })
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${SPOTIFY_SEARCH_ENDPOINT}?q=lofi&type=track&limit=5&offset=10`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" })
      })
    );

    expect(tracks).toEqual([
      {
        id: "track-1",
        title: "Track One",
        artistNames: ["Artist One"],
        uri: "spotify:track:track-1"
      }
    ]);
  });
});
