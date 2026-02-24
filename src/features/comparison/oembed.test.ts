import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSpotifyEmbedUrl } from "./oembed";

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

describe("resolveSpotifyEmbedUrl", () => {
    beforeEach(() => {
        mockFetch.mockReset();
        globalThis.fetch = mockFetch as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("resolves iframe_url from oEmbed response", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ iframe_url: "https://open.spotify.com/embed/track/abc123" })
        });

        const embedUrl = await resolveSpotifyEmbedUrl("spotify:track:abc123");

        expect(embedUrl).toBe("https://open.spotify.com/embed/track/abc123");
        expect(mockFetch).toHaveBeenCalledWith(
            "https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2Fabc123"
        );
    });

    it("falls back to extracting src from html response", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                html: '<iframe src="https://open.spotify.com/embed/track/xyz789" width="100%"></iframe>'
            })
        });

        const embedUrl = await resolveSpotifyEmbedUrl("spotify:track:xyz789");

        expect(embedUrl).toBe("https://open.spotify.com/embed/track/xyz789");
    });

    it("throws for invalid spotify URI", async () => {
        await expect(resolveSpotifyEmbedUrl("spotify:album:abc123")).rejects.toThrow(
            "invalid_spotify_uri"
        );
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws when oEmbed request fails", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({})
        });

        await expect(resolveSpotifyEmbedUrl("spotify:track:abc123")).rejects.toThrow(
            "oembed_request_failed"
        );
    });
});
